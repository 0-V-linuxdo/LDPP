/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { asString, asStringArray, isObject } from "@utils/guards";
import { normalizeText } from "@utils/text";

export interface RegexRule {
    pattern: string;
    note: string;
}

export interface BlockRules {
    titleKeywords: string[];
    categories: string[];
    tags: string[];
    titleRegex: RegexRule[];
    categoryRegex: RegexRule[];
    tagRegex: RegexRule[];
}

export type RuleKind = "titleKeyword" | "category" | "tag" | "titleRegex" | "categoryRegex" | "tagRegex";

export interface BlockReason {
    kind: RuleKind;
    rule: string;
    matched: string;
    note?: string;
}

export interface TopicFacts {
    title: string;
    category: string;
    tags: string[];
}

interface CompiledRegex {
    rule: RegexRule;
    regex: RegExp;
}

export interface CompiledRules {
    titleKeywords: Array<[string, string]>;
    categories: Map<string, string>;
    tags: Map<string, string>;
    titleRegex: CompiledRegex[];
    categoryRegex: CompiledRegex[];
    tagRegex: CompiledRegex[];
    invalid: string[];
}

export const EMPTY_RULES: BlockRules = { titleKeywords: [], categories: [], tags: [], titleRegex: [], categoryRegex: [], tagRegex: [] };

const SLASHED = /^\/(.+)\/([dgimsuvy]*)$/s;

export const fold = (value: string) => normalizeText(value).toLowerCase();

export function parseRegex(pattern: string): RegExp {
    const trimmed = pattern.trim();
    const slashed = trimmed.match(SLASHED);
    return slashed ? new RegExp(slashed[1], slashed[2].replace(/[gy]/g, "")) : new RegExp(trimmed);
}

export function regexError(pattern: string): string | null {
    try {
        parseRegex(pattern);
        return null;
    } catch (error) {
        return (error as Error).message;
    }
}

export function normalizeRegexRules(raw: unknown): RegexRule[] {
    if (!Array.isArray(raw)) return [];
    const out: RegexRule[] = [];
    for (const item of raw) {
        const rule = typeof item === "string" ? { pattern: item.trim(), note: "" } : isObject(item) ? { pattern: asString(item.pattern ?? item.value), note: asString(item.note) } : null;
        if (rule?.pattern) out.push(rule);
    }
    return out;
}

export function normalizeRules(raw: unknown): BlockRules {
    const source = isObject(raw) ? raw : {};
    return {
        titleKeywords: dedupe(asStringArray(source.titleKeywords)),
        categories: dedupe(asStringArray(source.categories)),
        tags: dedupe(asStringArray(source.tags)),
        titleRegex: normalizeRegexRules(source.titleRegex),
        categoryRegex: normalizeRegexRules(source.categoryRegex),
        tagRegex: normalizeRegexRules(source.tagRegex),
    };
}

export function dedupe(values: string[]): string[] {
    const seen = new Set<string>();
    return values.filter(value => {
        const key = fold(value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function compileList(rules: RegexRule[], invalid: string[]): CompiledRegex[] {
    const out: CompiledRegex[] = [];
    for (const rule of rules) {
        try { out.push({ rule, regex: parseRegex(rule.pattern) }); } catch { invalid.push(rule.pattern); }
    }
    return out;
}

export function compileRules(rules: BlockRules): CompiledRules {
    const invalid: string[] = [];
    return {
        titleKeywords: rules.titleKeywords.map(keyword => [fold(keyword), keyword]),
        categories: new Map(rules.categories.map(value => [fold(value), value])),
        tags: new Map(rules.tags.map(value => [fold(value), value])),
        titleRegex: compileList(rules.titleRegex, invalid),
        categoryRegex: compileList(rules.categoryRegex, invalid),
        tagRegex: compileList(rules.tagRegex, invalid),
        invalid,
    };
}

function testRegex(list: CompiledRegex[], kind: RuleKind, value: string, out: BlockReason[]) {
    if (!value) return;
    for (const { rule, regex } of list) {
        regex.lastIndex = 0;
        if (regex.test(value)) out.push({ kind, rule: rule.pattern, matched: value, note: rule.note || undefined });
    }
}

export function evaluate(compiled: CompiledRules, facts: TopicFacts): BlockReason[] {
    const reasons: BlockReason[] = [];
    const title = fold(facts.title);
    if (title) {
        for (const [folded, keyword] of compiled.titleKeywords) if (folded && title.includes(folded)) reasons.push({ kind: "titleKeyword", rule: keyword, matched: facts.title });
    }
    testRegex(compiled.titleRegex, "titleRegex", facts.title, reasons);
    const category = compiled.categories.get(fold(facts.category));
    if (facts.category && category) reasons.push({ kind: "category", rule: category, matched: facts.category });
    testRegex(compiled.categoryRegex, "categoryRegex", facts.category, reasons);
    for (const tag of facts.tags) {
        const hit = compiled.tags.get(fold(tag));
        if (hit) reasons.push({ kind: "tag", rule: hit, matched: tag });
        testRegex(compiled.tagRegex, "tagRegex", tag, reasons);
    }
    return reasons;
}

export const REASON_LABEL: Record<RuleKind, string> = {
    titleKeyword: "标题关键词",
    titleRegex: "标题正则",
    category: "类别",
    categoryRegex: "类别正则",
    tag: "标签",
    tagRegex: "标签正则",
};

const LIST_OF: Record<RuleKind, keyof BlockRules> = {
    titleKeyword: "titleKeywords",
    category: "categories",
    tag: "tags",
    titleRegex: "titleRegex",
    categoryRegex: "categoryRegex",
    tagRegex: "tagRegex",
};

export function withAdditions(rules: BlockRules, additions: { titleKeywords?: string[]; categories?: string[]; tags?: string[] }): BlockRules {
    return {
        ...rules,
        titleKeywords: dedupe([...rules.titleKeywords, ...(additions.titleKeywords ?? [])]),
        categories: dedupe([...rules.categories, ...(additions.categories ?? [])]),
        tags: dedupe([...rules.tags, ...(additions.tags ?? [])]),
    };
}

export function withoutReasons(rules: BlockRules, reasons: BlockReason[]): BlockRules {
    const next: BlockRules = structuredClone(rules);
    for (const reason of reasons) {
        const key = LIST_OF[reason.kind];
        if (key === "titleKeywords" || key === "categories" || key === "tags") {
            next[key] = next[key].filter(value => fold(value) !== fold(reason.rule));
        } else {
            next[key] = next[key].filter(rule => rule.pattern !== reason.rule);
        }
    }
    return next;
}

export function countRules(rules: BlockRules): number {
    return Object.values(rules).reduce((sum, list) => sum + list.length, 0);
}
