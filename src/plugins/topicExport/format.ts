/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { TopicPost } from "@api/Discourse";
import { cookedToText } from "@api/TopicContent";
import { escapeHtml } from "@utils/text";

export type ExportFormat = "md" | "html" | "json" | "txt";

export interface ExportTopic {
    topicId: string;
    title: string;
    url: string;
    posts: TopicPost[];
    summary?: string;
    exportedAt: Date;
}

const absolute = (href: string) => {
    try { return new URL(href, "https://linux.do/").href; } catch { return href; }
};

const isEmoji = (img: Element) => /\bemoji\b/.test(img.className);

/** The cooked HTML of a post as Markdown: what Discourse renders, written back the way it would be typed. */
export function cookedToMarkdown(cooked: string): string {
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${cooked}`, "text/html");
    for (const el of Array.from(doc.querySelectorAll("script, style, .lightbox-wrapper .meta, .cooked-date + .relative-date"))) el.remove();
    return blocks(doc.body, "").replace(/\n{3,}/g, "\n\n").trim();
}

function inline(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return (node.nodeValue ?? "").replace(/\s+/g, " ");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const el = node as HTMLElement;
    const inner = () => Array.from(el.childNodes).map(inline).join("");
    switch (el.tagName) {
        case "BR": return "\n";
        case "STRONG": case "B": return wrap(inner(), "**");
        case "EM": case "I": return wrap(inner(), "*");
        case "S": case "DEL": case "STRIKE": return wrap(inner(), "~~");
        case "CODE": return codeSpan(el.textContent ?? "");
        case "IMG": {
            const img = el as HTMLImageElement;
            if (isEmoji(img)) return img.getAttribute("alt") ?? img.getAttribute("title") ?? "";
            const lightbox = img.closest("a.lightbox")?.getAttribute("href");
            const src = lightbox ?? img.getAttribute("data-orig-src") ?? img.getAttribute("src") ?? "";
            return `![${(img.getAttribute("alt") ?? "").replace(/[[\]]/g, "")}](${absolute(src)})`;
        }
        case "A": {
            if (el.classList.contains("lightbox")) return inner();
            const href = el.getAttribute("href");
            const text = inner().trim();
            if (!href) return text;
            if (el.classList.contains("mention") || el.classList.contains("hashtag-cooked")) return text;
            const url = absolute(href);
            return !text || text === href || text === url ? url : `[${text}](${url})`;
        }
        default: return inner();
    }
}

function wrap(text: string, marker: string): string {
    const trimmed = text.trim();
    return trimmed ? `${marker}${trimmed}${marker}` : "";
}

function codeSpan(text: string): string {
    const longest = Math.max(0, ...(text.match(/`+/g) ?? []).map(run => run.length));
    const fence = "`".repeat(longest + 1);
    return longest ? `${fence} ${text} ${fence}` : `${fence}${text}${fence}`;
}

const BLOCK = new Set(["P", "DIV", "UL", "OL", "LI", "PRE", "BLOCKQUOTE", "ASIDE", "TABLE", "H1", "H2", "H3", "H4", "H5", "H6", "HR", "DETAILS", "SUMMARY", "FIGURE"]);

const prefixLines = (text: string, prefix: string) => text.split("\n").map(line => (line ? prefix + line : prefix.trimEnd())).join("\n");

/** Block-level children of `el`, joined with blank lines; inline runs between blocks become paragraphs. */
function blocks(el: Element, indent: string): string {
    const out: string[] = [];
    let run = "";
    const flushRun = () => {
        const text = run.replace(/[ \t]*\n[ \t]*/g, "\n").trim();
        if (text) out.push(text);
        run = "";
    };
    for (const child of Array.from(el.childNodes)) {
        if (child.nodeType === Node.ELEMENT_NODE && BLOCK.has((child as Element).tagName)) {
            flushRun();
            const text = block(child as HTMLElement, indent);
            if (text.trim()) out.push(text);
        } else {
            run += inline(child);
        }
    }
    flushRun();
    return out.join("\n\n");
}

function block(el: HTMLElement, indent: string): string {
    switch (el.tagName) {
        case "H1": case "H2": case "H3": case "H4": case "H5": case "H6":
            return `${"#".repeat(Number(el.tagName[1]))} ${Array.from(el.childNodes).map(inline).join("").trim()}`;
        case "HR": return "---";
        case "PRE": {
            const code = el.querySelector("code");
            const lang = (code?.className.match(/lang-([\w+#-]+)/)?.[1] ?? "").replace(/^(auto|plaintext|nohighlight)$/, "");
            const text = (code ?? el).textContent ?? "";
            const longest = Math.max(2, ...(text.match(/^`{3,}/gm) ?? []).map(run => run.length));
            const fence = "`".repeat(longest + 1);
            return `${fence}${lang}\n${text.replace(/\n$/, "")}\n${fence}`;
        }
        case "BLOCKQUOTE": return prefixLines(blocks(el, ""), "> ");
        case "ASIDE": {
            if (el.classList.contains("onebox")) {
                const src = el.getAttribute("data-onebox-src") ?? el.querySelector("header a, h3 a, a")?.getAttribute("href") ?? "";
                const title = el.querySelector("h3, h4")?.textContent?.trim() ?? "";
                return src ? (title ? `[${title}](${absolute(src)})` : absolute(src)) : "";
            }
            if (el.classList.contains("quote")) {
                const who = el.getAttribute("data-username") ?? el.querySelector(".title")?.textContent?.trim().replace(/[:：]$/, "") ?? "";
                const quote = el.querySelector("blockquote");
                const body = quote ? blocks(quote, "") : "";
                return prefixLines(who ? `**${who}：**\n${body}` : body, "> ");
            }
            return blocks(el, indent);
        }
        case "UL": case "OL": {
            const ordered = el.tagName === "OL";
            let n = Number(el.getAttribute("start") ?? 1) || 1;
            return Array.from(el.children).filter(child => child.tagName === "LI").map(item => {
                const marker = ordered ? `${n++}. ` : "- ";
                const body = blocks(item, "").replace(/\n\n(?=[-\d])/g, "\n");
                return marker + body.split("\n").join(`\n${" ".repeat(marker.length)}`);
            }).join("\n");
        }
        case "TABLE": return table(el);
        case "DETAILS": {
            const summary = el.querySelector(":scope > summary");
            const title = summary ? Array.from(summary.childNodes).map(inline).join("").trim() : "详情";
            summary?.remove();
            return `<details>\n<summary>${title}</summary>\n\n${blocks(el, indent)}\n\n</details>`;
        }
        default: return blocks(el, indent);
    }
}

function table(el: HTMLElement): string {
    const rows = Array.from(el.querySelectorAll("tr")).map(row => Array.from(row.children).map(cell => Array.from(cell.childNodes).map(inline).join("").trim().replace(/\|/g, "\\|").replace(/\n/g, " ")));
    if (!rows.length) return "";
    const width = Math.max(...rows.map(row => row.length));
    const line = (cells: string[]) => `| ${Array.from({ length: width }, (_, i) => cells[i] ?? "").join(" | ")} |`;
    return [line(rows[0]), line(Array(width).fill("---")), ...rows.slice(1).map(line)].join("\n");
}

const pad = (value: number) => String(value).padStart(2, "0");

export function formatStamp(iso: string | undefined): string {
    const time = iso ? Date.parse(iso) : NaN;
    if (!Number.isFinite(time)) return "";
    const date = new Date(time);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const author = (post: TopicPost) => (post.name && post.name !== post.username ? `${post.name}（@${post.username}）` : `@${post.username}`);
const replyTo = (post: TopicPost) => (post.reply_to_user?.username ? ` 回复 @${post.reply_to_user.username}` : "");

function toMarkdown(topic: ExportTopic): string {
    const parts = [
        `# ${topic.title}`,
        `> 来源：${topic.url}  \n> 导出于 ${formatStamp(topic.exportedAt.toISOString())}，共 ${topic.posts.length} 楼`,
    ];
    if (topic.summary) parts.push(`## AI 总结\n\n${topic.summary.trim()}`);
    for (const post of topic.posts) {
        parts.push(`---\n\n### #${post.post_number} ${author(post)}${replyTo(post)} · ${formatStamp(post.created_at)}\n\n${cookedToMarkdown(post.cooked ?? "")}`);
    }
    return `${parts.join("\n\n")}\n`;
}

function toText(topic: ExportTopic): string {
    const parts = [topic.title, `来源：${topic.url}`, `导出于 ${formatStamp(topic.exportedAt.toISOString())}，共 ${topic.posts.length} 楼`];
    if (topic.summary) parts.push(`【AI 总结】\n${topic.summary.trim()}`);
    for (const post of topic.posts) {
        parts.push(`#${post.post_number} ${author(post)}${replyTo(post)} · ${formatStamp(post.created_at)}\n${cookedToText(post.cooked ?? "", img => img.alt || "[图片]")}`);
    }
    return `${parts.join("\n\n")}\n`;
}

/** Relative links and images in cooked HTML made absolute, so the saved file still shows them. */
function absoluteHtml(cooked: string): string {
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${cooked}`, "text/html");
    for (const el of Array.from(doc.querySelectorAll("[href], [src], [srcset]"))) {
        for (const attr of ["href", "src"]) {
            const value = el.getAttribute(attr);
            if (value && !value.startsWith("#") && !value.startsWith("data:")) el.setAttribute(attr, absolute(value));
        }
        el.removeAttribute("srcset");
    }
    for (const el of Array.from(doc.querySelectorAll("script"))) el.remove();
    return doc.body.innerHTML;
}

const HTML_STYLE = `body{max-width:860px;margin:2rem auto;padding:0 1rem;font:16px/1.7 system-ui,-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#222}
h1{font-size:1.6rem}a{color:#0969da}img{max-width:100%;height:auto}img.emoji{width:1.2em;height:1.2em;vertical-align:middle}
.post{border-top:1px solid #ddd;padding:1rem 0}.meta{color:#666;font-size:.9rem;margin-bottom:.5rem}
pre{background:#f6f8fa;padding:.75rem;overflow:auto;border-radius:6px}code{font-family:ui-monospace,monospace}
blockquote,aside.quote{border-left:4px solid #ddd;margin:0 0 1rem;padding:0 1rem;color:#555}.summary{background:#f6f8fa;padding:1rem;border-radius:8px;white-space:pre-wrap}
table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:.3rem .6rem}.lightbox-wrapper .meta{display:none}
@media (prefers-color-scheme:dark){body{background:#111;color:#ddd}.post{border-color:#333}pre,.summary{background:#1c1c1c}a{color:#58a6ff}}`;

function toHtml(topic: ExportTopic): string {
    const posts = topic.posts.map(post => `<article class="post" id="post-${post.post_number}">
<div class="meta">#${post.post_number} ${escapeHtml(author(post))}${escapeHtml(replyTo(post))} · ${escapeHtml(formatStamp(post.created_at))}</div>
<div class="cooked">${absoluteHtml(post.cooked ?? "")}</div>
</article>`).join("\n");
    return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(topic.title)}</title><style>${HTML_STYLE}</style></head>
<body>
<h1>${escapeHtml(topic.title)}</h1>
<p class="meta">来源：<a href="${escapeHtml(topic.url)}">${escapeHtml(topic.url)}</a> · 导出于 ${escapeHtml(formatStamp(topic.exportedAt.toISOString()))}，共 ${topic.posts.length} 楼</p>
${topic.summary ? `<h2>AI 总结</h2><div class="summary">${escapeHtml(topic.summary.trim())}</div>` : ""}
${posts}
</body></html>
`;
}

function toJson(topic: ExportTopic): string {
    return JSON.stringify({
        topicId: topic.topicId,
        title: topic.title,
        url: topic.url,
        exportedAt: topic.exportedAt.toISOString(),
        summary: topic.summary,
        posts: topic.posts.map(post => ({
            postNumber: post.post_number,
            username: post.username,
            name: post.name || undefined,
            replyTo: post.reply_to_user?.username,
            createdAt: post.created_at,
            markdown: cookedToMarkdown(post.cooked ?? ""),
            cooked: post.cooked,
        })),
    }, null, 2);
}

export const FORMATS: ReadonlyArray<{ id: ExportFormat; label: string; mime: string }> = [
    { id: "md", label: "Markdown", mime: "text/markdown" },
    { id: "html", label: "HTML", mime: "text/html" },
    { id: "txt", label: "纯文本", mime: "text/plain" },
    { id: "json", label: "JSON", mime: "application/json" },
];

export function renderExport(topic: ExportTopic, format: ExportFormat): string {
    switch (format) {
        case "md": return toMarkdown(topic);
        case "html": return toHtml(topic);
        case "txt": return toText(topic);
        case "json": return toJson(topic);
    }
}

/** A file name from the title: no characters file systems reject, at most 60 characters. */
export function exportFileName(topic: Pick<ExportTopic, "topicId" | "title">, format: ExportFormat): string {
    const base = topic.title.replace(/[\\/:*?"<>|\p{Cc}]+/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "topic";
    return `${base}-${topic.topicId}.${format}`;
}
