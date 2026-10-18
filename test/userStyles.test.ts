/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { registerPlugin } from "../src/api/PluginManager";
import UserStyles, { applyAll, buildStyle, getStyle, installStyle, listStyles, recompile, settings, updateStyle } from "../src/plugins/_core/userStyles";
import { formatCss, highlightCss } from "../src/plugins/_core/userStyles/cssEditor";
import { appliesToSite, compileUserCss, cssFor, extractSections, parseUserCss, readStylusBackup, sectionMatches, sectionsToSource } from "../src/plugins/_core/userStyles/usercss";

const USO = `/* ==UserStyle==
@name        Clean Navigation
@namespace   local
@version     1.0.0
@preprocessor uso
@var select hideCreate "Hide create" {
  "Hide": "none",
  "Show": "revert"
}
@var color accent "Accent" #3366ff
@var text label "Label" "帖子"
@advanced dropdown layout "Layout" {
  wide "Wide*" <<<EOT
  .wrap { max-width: none; border-color: /*[[accent]]*/; } EOT;
  narrow "Narrow" <<<EOT
  .wrap { max-width: 60rem; } EOT;
}
==/UserStyle== */

@-moz-document domain("linux.do") {
  .create { display: /*[[hideCreate]]*/ !important; }
  .nav::after { content: "/*[[label]]*/"; color: rgba(/*[[accent-rgb]]*/, .5); }
  /*[[layout]]*/
}

@-moz-document domain("example.com") {
  body { color: red; }
}`;

describe("UserCSS compiling (Stylus semantics)", () => {
    test("uso: placeholders take option values, -rgb colours and nested dropdown code", () => {
        const meta = parseUserCss(USO);
        expect(meta.preprocessor).toBe("uso");
        expect(Object.keys(meta.vars)).toEqual(["hideCreate", "accent", "label", "layout"]);
        const css = cssFor(compileUserCss(USO, meta), "https://linux.do/latest");
        expect(css).toContain("display: none !important");
        expect(css).toContain("content: \"帖子\"");
        expect(css).toContain("rgba(51, 102, 255, .5)");
        expect(css).toContain(".wrap { max-width: none; border-color: #3366ff; }");
        expect(css).not.toContain("/*[[");
        expect(css).not.toContain("color: red");
    });

    test("default preprocessor: variables become :root custom properties after @import", () => {
        const source = `/* ==UserStyle==
@name   Vars
@var color bg "Background" #101010
@var number gap "Gap" [8, 0, 32, 1, "px"]
==/UserStyle== */
@import url("https://example.com/font.css");
a { gap: var(--gap); }`;
        const sections = compileUserCss(source, parseUserCss(source));
        expect(sections).toHaveLength(1);
        expect(sections[0].code).toBe("@import url(\"https://example.com/font.css\");\n:root {\n  --bg: #101010;\n  --gap: 8px;\n}\na { gap: var(--gap); }");
    });

    test("stylus/less sources explain how to import them instead of failing silently", () => {
        const source = "/* ==UserStyle==\n@name S\n@preprocessor stylus\n==/UserStyle== */\na\n  color red";
        expect(() => compileUserCss(source, parseUserCss(source))).toThrow(/stylus.*备份/);
    });

    test("malformed metadata is reported in Chinese", () => {
        expect(() => parseUserCss("a { color: red }")).toThrow("没有找到 ==UserStyle== 元数据");
    });
});

describe("@-moz-document sections", () => {
    const css = `/* { not a block } */
.global { color: "}"; }
@-moz-document url-prefix("https://linux.do/t/"), regexp("https:\\\\/\\\\/linux\\\\.do\\\\/u\\\\/.*") {
  @media (max-width: 600px) { .a { b: c; } }
  .x::before { content: "{"; }
}
@document domain(linux.do) { .y { z: 1 } }`;

    test("splits global code and each block, keeping nested @media and braces inside strings/comments", () => {
        const sections = extractSections(css);
        expect(sections).toHaveLength(3);
        expect(sections[0]).toEqual({ code: "/* { not a block } */\n.global { color: \"}\"; }" });
        expect(sections[1].urlPrefixes).toEqual(["https://linux.do/t/"]);
        expect(sections[1].regexps).toEqual(["https:\\/\\/linux\\.do\\/u\\/.*"]);
        expect(sections[1].code).toContain("@media (max-width: 600px) { .a { b: c; } }");
        expect(sections[1].code).toContain("content: \"{\"");
        expect(sections[2]).toEqual({ domains: ["linux.do"], code: ".y { z: 1 }" });
    });

    test("matching: subdomains, URL prefixes, full-match regexps, exact URLs without the hash, global code", () => {
        expect(sectionMatches({ code: "", domains: ["linux.do"] }, "https://cdn.linux.do/x")).toBe(true);
        expect(sectionMatches({ code: "", domains: ["linux.do"] }, "https://notlinux.do/")).toBe(false);
        expect(sectionMatches({ code: "", urlPrefixes: ["https://linux.do/t/"] }, "https://linux.do/t/topic/1")).toBe(true);
        expect(sectionMatches({ code: "", regexps: ["https://linux\\.do/u/.*"] }, "https://linux.do/u/me")).toBe(true);
        expect(sectionMatches({ code: "", regexps: ["linux"] }, "https://linux.do/u/me")).toBe(false);
        expect(sectionMatches({ code: "", urls: ["https://linux.do/latest"] }, "https://linux.do/latest#top")).toBe(true);
        expect(sectionMatches({ code: "" }, "https://linux.do/")).toBe(true);
    });

    test("styles for other sites are recognised as not applying to linux.do", () => {
        expect(appliesToSite([{ code: "a{}", domains: ["github.com"] }])).toBe(false);
        expect(appliesToSite([{ code: "a{}", regexps: ["https://(www\\.)?linux\\.do/.*"] }])).toBe(true);
        expect(appliesToSite([{ code: "a{}" }])).toBe(true);
    });

    test("sections round-trip through an editable source", () => {
        const sections = extractSections(css);
        expect(extractSections(sectionsToSource(sections))).toEqual(sections);
    });
});

describe("Stylus backup JSON", () => {
    const backup = [
        { settings: {}, order: {} },
        { name: "[Linux.Do] CSS", enabled: true, sections: [{ code: ".a{b:c}", domains: ["linux.do"] }, { code: "/* empty */" }] },
        { name: "GitHub", enabled: false, sections: [{ code: "x{}", domains: ["github.com"] }] },
        {
            name: "Clean Navigation",
            enabled: true,
            sourceCode: USO,
            usercssData: { preprocessor: "uso", vars: { hideCreate: { type: "select", label: "Hide create", name: "hideCreate", value: "Show", default: "Hide", options: [{ name: "Hide", label: "Hide", value: "none" }, { name: "Show", label: "Show", value: "revert" }] } } },
            sections: [{ code: ".create{display:revert!important}", domains: ["linux.do"] }],
        },
    ];

    test("reads styles, drops empty sections and keeps the user's variable values", () => {
        const styles = readStylusBackup(backup)!;
        expect(styles.map(style => style.name)).toEqual(["[Linux.Do] CSS", "GitHub", "Clean Navigation"]);
        expect(styles[0].sections).toEqual([{ code: ".a{b:c}", domains: ["linux.do"] }]);
        expect(styles.filter(style => appliesToSite(style.sections)).map(style => style.name)).toEqual(["[Linux.Do] CSS", "Clean Navigation"]);
        expect(styles[2].vars?.hideCreate.value).toBe("Show");
        expect(readStylusBackup({ plugins: {} })).toBeNull();
    });
});

describe("installed styles", () => {
    beforeAll(() => registerPlugin(UserStyles));
    beforeEach(() => {
        settings.store.styles = [];
        settings.store.quickCss = "";
        settings.store.quickCssEnabled = true;
    });

    test("a reinstall replaces the old copy and keeps its id, on/off state and variable choices", () => {
        const first = buildStyle({ source: USO });
        installStyle(first);
        updateStyle(first.id, { enabled: false });
        updateStyle(first.id, recompile(getStyle(first.id)!, { ...first.vars, hideCreate: { ...first.vars.hideCreate, value: "Show" } }));
        expect(cssFor(getStyle(first.id)!.sections, "https://linux.do/")).toContain("display: revert");

        const again = buildStyle({ source: USO.replace("1.0.0", "1.1.0") });
        expect(installStyle(again)).toBe("updated");
        const [only] = listStyles();
        expect(listStyles()).toHaveLength(1);
        expect(only.id).toBe(first.id);
        expect(only.version).toBe("1.1.0");
        expect(only.enabled).toBe(false);
        expect(only.vars.hideCreate.value).toBe("Show");
    });

    test("styles go after the page's stylesheets, quick CSS after every style; disabled ones are removed", () => {
        const style = buildStyle({ source: ".from-style { color: red }", name: "Plain" });
        installStyle(style);
        settings.store.quickCss = ".quick { color: blue }";
        applyAll();
        const host = document.documentElement.lastElementChild!;
        expect(host.tagName.toLowerCase()).toBe("ldpp-user-styles");
        expect([...host.children].map(el => el.textContent)).toEqual([".from-style { color: red }", ".quick { color: blue }"]);

        updateStyle(style.id, { enabled: false });
        expect([...host.children].map(el => el.textContent)).toEqual([".quick { color: blue }"]);
        settings.store.quickCssEnabled = false;
        applyAll();
        expect(host.children).toHaveLength(0);
    });
});

describe("CSS editor helpers", () => {
    test("formatCss keeps pseudo-class colons and adds the missing last semicolon", () => {
        expect(formatCss("a:hover{color:red;background:blue}")).toBe("a:hover {\n    color: red;\n    background: blue;\n}\n");
    });

    test("highlighting builds text, never markup from the CSS", () => {
        const host = document.createElement("pre");
        host.append(highlightCss("/* <img src=x onerror=alert(1)> */ a { content: \"<b>\" }"));
        expect(host.querySelector("img, b")).toBeNull();
        expect(host.textContent).toBe("/* <img src=x onerror=alert(1)> */ a { content: \"<b>\" }\n");
    });
});
