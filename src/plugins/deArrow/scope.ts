/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { escapeRegExp } from "@utils/text";

export const DEFAULT_SCOPE = ["https://linux.do/latest?order=created", "https://linux.do/top?ascending=false&order=views"];

const WILDCARD = "__ldpp_wildcard__";

export interface ScopeCheck {
    rules: string[];
    errors: string[];
}

export function parseScopeLine(line: string): string {
    const trimmed = line.trim().replace(/#.*$/, "");
    const url = new URL(trimmed.replaceAll("*", WILDCARD));
    if (url.protocol !== "https:" || url.hostname !== "linux.do" || url.port || url.username || url.password) throw new Error("只支持 https://linux.do 下的地址");
    url.hash = "";
    return url.href.replaceAll(WILDCARD, "*");
}

export function checkScope(raw: string | string[]): ScopeCheck {
    const lines = Array.isArray(raw) ? raw : raw.split(/\r?\n/);
    const rules: string[] = [];
    const errors: string[] = [];
    for (const [index, line] of lines.entries()) {
        if (!line.trim()) continue;
        try {
            const rule = parseScopeLine(line);
            if (!rules.includes(rule)) rules.push(rule);
        } catch (error) {
            errors.push(`第 ${index + 1} 行「${line.trim()}」无效：${error instanceof TypeError ? "不是完整的 URL" : (error as Error).message}`);
        }
    }
    if (!rules.length && !errors.length) errors.push("至少需要一条作用范围 URL");
    return { rules, errors };
}

export function compileScope(rules: string[]): RegExp[] {
    return rules.map(rule => new RegExp(`^${rule.split("*").map(escapeRegExp).join(".*")}$`));
}

export function scopeMatches(compiled: RegExp[], href: string): boolean {
    let url: URL;
    try { url = new URL(href); } catch { return false; }
    url.hash = "";
    return compiled.some(regex => regex.test(url.href));
}
