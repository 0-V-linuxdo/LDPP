/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Marked } from "marked";

import { sanitizeHtml } from "./sanitize";

export type RenderMode = "html" | "markdown";

const md = new Marked({ gfm: true, breaks: true, async: false });
const HTML_TAG = /<\/?(?:p|div|h[1-6]|ul|ol|li|b|strong|em|i|br|hr|table|span|blockquote|pre|code)\b[^>]*>/i;
const MD_MARK = /(?:^|\n)\s{0,3}(?:#{1,6}\s|[-*+]\s|\d+[.)]\s|>\s|```|---\s*(?:\n|$))/;

export function inferRenderMode(text: string, fallback: RenderMode = "markdown"): RenderMode {
    if (HTML_TAG.test(text)) return "html";
    if (MD_MARK.test(text)) return "markdown";
    return fallback;
}

export function renderMarkdown(text: string): string {
    return sanitizeHtml(md.parse(text) as string);
}

export function renderContent(text: string, mode?: RenderMode): string {
    const resolved = mode ?? inferRenderMode(text);
    return resolved === "html" ? sanitizeHtml(text) : renderMarkdown(text);
}
