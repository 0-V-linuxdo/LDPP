/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const WS = /\s+/g;
const REGEX_SPECIALS = /[.*+?^${}()|[\]\\]/g;
const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function normalizeText(value: unknown): string {
    return value == null ? "" : String(value).replace(WS, " ").trim();
}

export function escapeRegExp(value: string): string {
    return value.replace(REGEX_SPECIALS, "\\$&");
}

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

export interface TextEdit {
    from: string;
    to: string;
}

/** `value` with each edit's `from` (first occurrence) replaced by its `to`; edits not found or overlapping an earlier one are skipped. `placed` gives where each applied `to` starts. */
export function applyEdits(value: string, edits: readonly TextEdit[]): { text: string; placed: Array<{ edit: number; start: number }> } {
    const hits = edits.map((edit, index) => ({ index, at: edit.from ? value.indexOf(edit.from) : -1 })).filter(hit => hit.at >= 0).toSorted((a, b) => a.at - b.at);
    const placed: Array<{ edit: number; start: number }> = [];
    let text = "";
    let cursor = 0;
    for (const { index, at } of hits) {
        if (at < cursor) continue;
        text += value.slice(cursor, at);
        placed.push({ edit: index, start: text.length });
        text += edits[index].to;
        cursor = at + edits[index].from.length;
    }
    return { text: text + value.slice(cursor), placed };
}

export function visualWidth(value: string): number {
    let width = 0;
    for (const char of value) width += (char.codePointAt(0) ?? 0) > 0xff ? 2 : 1;
    return width;
}

export function truncateVisual(value: string, maxWidth: number): string {
    const text = normalizeText(value);
    if (visualWidth(text) <= maxWidth) return text;
    let width = 0;
    let out = "";
    for (const char of text) {
        const next = (char.codePointAt(0) ?? 0) > 0xff ? 2 : 1;
        if (width + next > maxWidth - 1) break;
        out += char;
        width += next;
    }
    return `${out}…`;
}

export function splitList(value: string): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of value.split(/[,，\n]/)) {
        const item = part.trim();
        const key = item.toLowerCase();
        if (!item || seen.has(key)) continue;
        seen.add(key);
        out.push(item);
    }
    return out;
}

export function formatTime(iso: string): string {
    const time = Date.parse(iso);
    return Number.isFinite(time) ? new Date(time).toLocaleString() : "未知时间";
}

/** A summary as one line of plain text (recent-topic cards, the summary toast): Markdown and HTML marks dropped, cut to `max` characters. */
export function summaryExcerpt(summary: string, max = 90): string {
    const text = summary
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&(lt|gt|quot|#39|amp);/g, (_, name: string) => ({ lt: "<", gt: ">", quot: '"', "#39": "'", amp: "&" })[name] ?? "")
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
        .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/[*_`>~|-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    return text.length > max ? `${text.slice(0, max)}…` : text;
}
