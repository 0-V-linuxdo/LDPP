/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Data side of 「关键词搜索增强」, kept compatible with the user's 「[LINUX DO] Keywords Search Enhanced」 userscript: the same
// six search orders (as `order:` tokens in the query) and colours, and the same export file
// ({ keywords: [{ keyword, filters: { sort } }], links: [{ label, url }] }), so files move both ways.

import { isObject } from "@utils/guards";

export const SORT_OPTIONS = [
    { id: "relevance", name: "相关性", token: "", color: "#00a1d6" },
    { id: "latest", name: "最新帖子", token: "order:latest", color: "#fb7299" },
    { id: "likes", name: "赞最多", token: "order:likes", color: "#ff9f29" },
    { id: "views", name: "浏览最多", token: "order:views", color: "#6966ff" },
    { id: "latest_topic", name: "最新话题", token: "order:latest_topic", color: "#8e44ad" },
    { id: "read", name: "最近阅读", token: "order:read", color: "#6dc781" },
] as const;

export type SortId = typeof SORT_OPTIONS[number]["id"];

export interface KeywordEntry {
    keyword: string;
    sort: SortId;
}

export interface LinkEntry {
    label: string;
    url: string;
}

export const sortOption = (id: string) => SORT_OPTIONS.find(option => option.id === id) ?? SORT_OPTIONS[0];

export function normalizeSort(raw: unknown): SortId {
    const id = String(raw ?? "").trim();
    return SORT_OPTIONS.some(option => option.id === id) ? id as SortId : "relevance";
}

const text = (value: unknown) => (typeof value === "string" ? value : String(value ?? "")).trim();

/** Keywords as LD++ stores them, or as the old script did (plain strings, `{ keyword, filters: { sort } }`, `{ keyword, sort }`). */
export function normalizeKeywords(raw: unknown): KeywordEntry[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: KeywordEntry[] = [];
    for (const item of raw) {
        const keyword = text(typeof item === "string" ? item : isObject(item) ? item.keyword : "");
        const sort = normalizeSort(isObject(item) ? (isObject(item.filters) ? item.filters.sort : item.sort) : "");
        const key = `${keyword.toLowerCase()}::${sort}`;
        if (!keyword || seen.has(key)) continue;
        seen.add(key);
        out.push({ keyword, sort });
    }
    return out;
}

const BLOCKED_PROTOCOLS = new Set(["javascript:", "data:", "vbscript:"]);

/** The address a saved link opens: full URLs, bare domains (`github.com/x`), `//host` and site paths; "" if unusable. */
export function resolveLink(raw: string, base = location.href): string {
    const value = raw.trim();
    if (!value) return "";
    const bareDomain = /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[\w-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#]|$)/i.test(value);
    const candidate = value.startsWith("//") ? `${new URL(base).protocol}${value}` : bareDomain ? `https://${value}` : value;
    try {
        const url = new URL(candidate, new URL("/", base));
        return BLOCKED_PROTOCOLS.has(url.protocol.toLowerCase()) ? "" : url.href;
    } catch {
        return "";
    }
}

export function normalizeLinks(raw: unknown, base = location.href): LinkEntry[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: LinkEntry[] = [];
    for (const item of raw) {
        const label = isObject(item) ? text(item.label ?? item.title) : "";
        const url = text(typeof item === "string" ? item : isObject(item) ? item.url ?? item.linkUrl ?? item.href : "");
        const key = resolveLink(url, base) || url.toLowerCase();
        if (!url || seen.has(key)) continue;
        seen.add(key);
        out.push({ label, url });
    }
    return out;
}

/** What a link shows when it has no label: host and path, as the old script did. */
export function linkLabel(entry: LinkEntry, base = location.href): string {
    if (entry.label.trim()) return entry.label.trim();
    const href = resolveLink(entry.url, base);
    if (!href) return entry.url || "链接";
    const url = new URL(href);
    if (url.protocol === "mailto:" || url.protocol === "tel:") return href.replace(/^[a-z]+:/i, "");
    const path = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
    return `${url.host}${path}${url.search}${url.hash}` || href;
}

/** The site search for a keyword, its order as the `order:` token Discourse understands. */
export function searchPath(entry: KeywordEntry): string {
    const query = [entry.keyword.trim(), sortOption(entry.sort).token].filter(Boolean).join(" ");
    return `/search?q=${encodeURIComponent(query)}`;
}

/** The old script's export file (or its bare keyword array); null for anything else. */
export function parseKeywordExport(raw: unknown): { keywords?: KeywordEntry[]; links?: LinkEntry[] } | null {
    if (Array.isArray(raw)) {
        const keywords = normalizeKeywords(raw);
        return keywords.length && raw.every(item => typeof item === "string" || (isObject(item) && "keyword" in item)) ? { keywords } : null;
    }
    if (!isObject(raw) || !(Array.isArray(raw.keywords) || Array.isArray(raw.links))) return null;
    if (Array.isArray(raw.keywords) && raw.keywords.some(item => !(typeof item === "string" || (isObject(item) && "keyword" in item)))) return null;
    return {
        keywords: Array.isArray(raw.keywords) ? normalizeKeywords(raw.keywords) : undefined,
        links: Array.isArray(raw.links) ? normalizeLinks(raw.links) : undefined,
    };
}

/** The file the old script reads: same shape as its own export. */
export function toExport(keywords: readonly KeywordEntry[], links: readonly LinkEntry[]) {
    return {
        keywords: keywords.map(entry => ({ keyword: entry.keyword, filters: { sort: entry.sort } })),
        links: links.map(entry => ({ label: entry.label, url: entry.url })),
    };
}
