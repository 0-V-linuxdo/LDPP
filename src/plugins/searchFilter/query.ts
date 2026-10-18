/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { asStringArray, isObject } from "@utils/guards";
import { escapeRegExp, normalizeText, splitList } from "@utils/text";

import { parseRegex } from "../topicBlocker/rules";

export interface SearchRule {
    blacklist: string[];
    whitelist: string[];
    regex: string[];
}

export type SearchVerdict = { kind: "blacklist"; value: string } | { kind: "regex"; value: string } | { kind: "whitelist"; value: string };

export const EMPTY_SEARCH_RULE: SearchRule = { blacklist: [], whitelist: [], regex: [] };

const DIRECTIVE = /^[a-z_]+:\S+$/i;

export function tokenize(query: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let quote = "";
    for (const char of query) {
        if ((char === "\"" || char === "'") && (!quote || quote === char)) {
            quote = quote ? "" : char;
            continue;
        }
        if (!quote && /\s/.test(char)) {
            if (current) tokens.push(current);
            current = "";
            continue;
        }
        current += char;
    }
    if (current) tokens.push(current);
    return tokens;
}

export function primaryTerm(query: string): string {
    const raw = normalizeText(query);
    const words = tokenize(raw).filter(token => /^https?:/i.test(token) || !DIRECTIVE.test(token));
    return words.join(" ").trim() || raw;
}

const list = (value: unknown) => typeof value === "string" ? splitList(value) : asStringArray(value);

export function normalizeSearchRule(raw: unknown): SearchRule {
    if (typeof raw === "string") return { ...EMPTY_SEARCH_RULE, blacklist: splitList(raw) };
    if (!isObject(raw)) return { ...EMPTY_SEARCH_RULE };
    const regex = typeof raw.regex === "string" ? raw.regex.split("\n").map(line => line.trim()).filter(Boolean) : asStringArray(raw.regex);
    return { blacklist: list(raw.blacklist), whitelist: list(raw.whitelist), regex };
}

export function normalizeSearchRules(raw: unknown): Record<string, SearchRule> {
    const out: Record<string, SearchRule> = {};
    if (!isObject(raw)) return out;
    for (const [term, rule] of Object.entries(raw)) {
        const key = normalizeText(term);
        const value = normalizeSearchRule(rule);
        if (key && (value.blacklist.length || value.whitelist.length || value.regex.length)) out[key] = value;
    }
    return out;
}

export function keywordMatches(text: string, keyword: string): boolean {
    const needle = normalizeText(keyword).toLowerCase();
    if (!needle) return false;
    if (!needle.includes(" ")) return text.toLowerCase().includes(needle);
    return new RegExp(needle.split(" ").map(escapeRegExp).join("\\s+"), "i").test(text);
}

export function evaluateSearch(rule: SearchRule, text: string): SearchVerdict[] {
    const out: SearchVerdict[] = [];
    for (const keyword of rule.blacklist) if (keywordMatches(text, keyword)) out.push({ kind: "blacklist", value: keyword });
    for (const pattern of rule.regex) {
        try {
            const regex = pattern.startsWith("/") ? parseRegex(pattern) : new RegExp(pattern, "i");
            if (regex.test(text)) out.push({ kind: "regex", value: pattern });
        } catch {
            continue;
        }
    }
    if (rule.whitelist.length && !rule.whitelist.some(keyword => keywordMatches(text, keyword))) out.push({ kind: "whitelist", value: rule.whitelist.join("、") });
    return out;
}
