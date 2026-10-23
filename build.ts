/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, watch } from "fs";
import { basename, dirname, relative, resolve } from "path";

const isDev = process.argv.includes("--dev");
const isWatch = process.argv.includes("--watch");
const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

const VERSION_DATE = "20261023.8";
const REPO_URL = "https://github.com/0-V-linuxdo/LDPP";
const RAW_URL = "https://raw.githubusercontent.com/0-V-linuxdo/LDPP/main/userscript";
const displayVersion = `[${VERSION_DATE}] v${pkg.version}`;

// Script managers check LDPP.meta.js for a newer @version and fetch LDPP.user.js from the repository. A dev build has
// none, so it is never replaced by the release.
const UPDATE_LINES = isDev ? "" : `// @updateURL    ${RAW_URL}/LDPP.meta.js
// @downloadURL  ${RAW_URL}/LDPP.user.js
`;

const HEADER = `// ==UserScript==
// @name         LD++
// @namespace    ${REPO_URL}
// @version      ${VERSION_DATE}
// @description  LINUX DO 增强：话题屏蔽、搜索过滤、AI 总结与追问、DeArrow 标题党改写、Google Drive 同步，一个脚本、互不打架。
// @author       LD++ Contributors
// @homepageURL  ${REPO_URL}
${UPDATE_LINES}// @match        https://linux.do/*
// @run-at       document-start
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @connect      *
// @license      GPL-3.0-or-later
// @noframes
// ==/UserScript==
`;

const BANNER = `/**
 * LD++ ${displayVersion} — a modification for linux.do
 * (c) ${new Date().getFullYear()} LD++ Contributors · GPL-3.0-or-later
 */`;

const pluginRoot = resolve("src/plugins");

function gitHash(): string {
    const result = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], { stderr: "pipe" });
    return result.success ? result.stdout.toString().trim() : "local";
}

// The 「最新」 tab lists plugins whose folder changed in the last week. Commits that touch only chores, docs or tests do
// not count as an update, nor does the 「[tag] 」 prefix some subjects carry.
const SKIP_UPDATE_SUBJECT = /^(chore|brand|docs|ci|style|test|build):/i;

function pluginUpdatedAt(folder: string): number {
    const result = Bun.spawnSync(["git", "log", "--format=%ct %s", "--", relative(process.cwd(), folder) || "."], { stderr: "pipe" });
    if (!result.success) {
        console.warn(`git log 失败：${relative(process.cwd(), folder)}`);
        return 0;
    }
    for (const line of result.stdout.toString().trim().split("\n")) {
        const space = line.indexOf(" ");
        if (space < 0) continue;
        let subject = line.slice(space + 1);
        const bracket = subject.indexOf("] ");
        if (subject.startsWith("[") && bracket !== -1) subject = subject.slice(bracket + 2);
        if (SKIP_UPDATE_SUBJECT.test(subject)) continue;
        const seconds = Number.parseInt(line.slice(0, space), 10);
        if (Number.isFinite(seconds)) return seconds * 1000;
    }
    return 0;
}

function scan(dir: string, imports: string[], names: string[], mutations: string[], counter: { i: number; stamped: number }) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name.startsWith("_") || entry.name.startsWith(".")) continue;
        if (entry.name.endsWith(".dev") && !isDev) continue;
        const folder = resolve(dir, entry.name);
        if (!existsSync(`${folder}/index.ts`)) continue;
        const name = `p${counter.i++}`;
        imports.push(`import ${name} from ${JSON.stringify(folder)};`);
        names.push(name);
        const updatedAt = pluginUpdatedAt(folder);
        if (updatedAt) counter.stamped++;
        mutations.push(`${name}.updatedAt = ${updatedAt};`);
    }
}

function pluginModule(): string {
    const imports: string[] = [];
    const names: string[] = [];
    const mutations: string[] = [];
    const counter = { i: 0, stamped: 0 };
    scan(resolve(pluginRoot, "_core"), imports, names, mutations, counter);
    scan(pluginRoot, imports, names, mutations, counter);
    if (!isDev && counter.i && !counter.stamped) throw new Error("git log 没有返回任何功能的更新时间，「最新」页会是空的");
    return `${imports.join("\n")}\n${mutations.join("\n")}\nexport default { ${names.map(name => `[${name}.name]: ${name}`).join(", ")} };\n`;
}

const virtualPlugins: import("bun").BunPlugin = {
    name: "ldpp-plugins",
    setup(builder) {
        builder.onResolve({ filter: /^~plugins$/ }, () => ({ path: "~plugins", namespace: "ldpp-virtual" }));
        builder.onLoad({ filter: /.*/, namespace: "ldpp-virtual" }, () => ({ contents: pluginModule(), loader: "ts", resolveDir: pluginRoot }));
    },
};

const cssModules: import("bun").BunPlugin = {
    name: "ldpp-css",
    setup(builder) {
        // Paths relative to the project: Bun names each module in a comment, and an absolute path would carry the builder's home folder.
        builder.onResolve({ filter: /\.css$/ }, args => ({ path: relative(process.cwd(), resolve(args.resolveDir, args.path)), namespace: "ldpp-css" }));
        builder.onLoad({ filter: /.*/, namespace: "ldpp-css" }, async args => {
            const css = await Bun.file(resolve(args.path)).text();
            const file = basename(args.path, ".css");
            const name = file === "styles" ? basename(dirname(args.path)) : file;
            return {
                contents: `import { registerStyle } from ${JSON.stringify(resolve("src/utils/css.ts"))};\nregisterStyle(${JSON.stringify(name)}, ${JSON.stringify(css)});\n`,
                loader: "js",
            };
        });
    },
};

// usercss-meta maps Node's `url` to a one-line `self.URL` shim through its package.json "browser" field, which
// Bun.build does not apply; without this the bundle gains a ~90 KB `url` polyfill.
const browserShims: import("bun").BunPlugin = {
    name: "ldpp-browser-shims",
    setup(builder) {
        builder.onResolve({ filter: /^url$/ }, args => args.importer.includes("usercss-meta") ? { path: resolve("node_modules/usercss-meta/shim/url.js") } : undefined);
    },
};

async function build() {
    const started = performance.now();
    const result = await Bun.build({
        entrypoints: ["src/index.ts"],
        target: "browser",
        format: "iife",
        minify: false,
        sourcemap: isDev ? "inline" : "none",
        define: {
            IS_DEV: JSON.stringify(isDev),
            VERSION: JSON.stringify(displayVersion),
            GIT_HASH: JSON.stringify(gitHash()),
        },
        plugins: [virtualPlugins, cssModules, browserShims],
    });
    if (!result.success) {
        for (const log of result.logs) console.error(log);
        throw new Error("构建失败");
    }
    const code = await result.outputs[0].text();
    const content = `${HEADER}\n${BANNER}\n${code}`;
    mkdirSync("userscript", { recursive: true });
    mkdirSync("dist", { recursive: true });
    await Bun.write(isDev ? "dist/LDPP.dev.user.js" : "userscript/LDPP.user.js", content);
    if (!isDev) await Bun.write("userscript/LDPP.meta.js", HEADER);
    console.log(`LD++ ${displayVersion} → ${isDev ? "dist/LDPP.dev.user.js" : "userscript/LDPP.user.js"} (${(content.length / 1024).toFixed(1)} KB, ${Math.round(performance.now() - started)}ms)`);
}

await build();

if (isWatch) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    watch("src", { recursive: true }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => build().catch(error => console.error(error)), 200);
    });
    console.log("监听 src/ 变更中…");
}
