/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(import.meta.dir, "..", "src");

function cssFiles(dir: string): string[] {
    return readdirSync(dir).flatMap(name => {
        const path = join(dir, name);
        return statSync(path).isDirectory() ? cssFiles(path) : name.endsWith(".css") ? [path] : [];
    });
}

/** A selector list split on its own commas, not on those inside :is() / :not() / :has(). */
function topLevel(list: string): string[] {
    const parts: string[] = [];
    let depth = 0, start = 0;
    for (let i = 0; i < list.length; i++) {
        if (list[i] === "(") depth++;
        else if (list[i] === ")") depth--;
        else if (list[i] === "," && depth === 0) { parts.push(list.slice(start, i)); start = i + 1; }
    }
    return [...parts, list.slice(start)];
}

/** Classes a file styles on their own (`.name {`, `.name[hidden] {`, `.name::after {`), as opposed to in a context. */
function ownClasses(css: string): Set<string> {
    const names = new Set<string>();
    const text = css.replaceAll(/\/\*[\s\S]*?\*\//g, "");
    for (const match of text.matchAll(/([^{}]+)\{/g)) {
        for (const selector of topLevel(match[1])) {
            const own = selector.trim().match(/^\.(ldpp-[\w-]+)(?:\[[^\]]*\]|::?[\w-]+(?:\([^)]*\))?)*$/);
            if (own) names.add(own[1]);
        }
    }
    return names;
}

describe("CSS class names", () => {
    test("no two modules define the same class (a reused name silently restyles the other module's element)", () => {
        const owners = new Map<string, string[]>();
        for (const file of cssFiles(SRC)) {
            for (const name of ownClasses(readFileSync(file, "utf8"))) owners.set(name, [...owners.get(name) ?? [], relative(SRC, file)]);
        }
        const clashes = [...owners].filter(([, files]) => files.length > 1).map(([name, files]) => `${name}: ${files.join(", ")}`);
        expect(clashes).toEqual([]);
    });
});
