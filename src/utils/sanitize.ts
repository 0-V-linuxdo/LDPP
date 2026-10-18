/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const KEEP_TAGS = new Set([
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6", "b", "strong", "i", "em", "u", "s", "del", "ins", "mark", "small", "sub", "sup",
    "code", "pre", "kbd", "blockquote", "ul", "ol", "li", "dl", "dt", "dd", "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
    "span", "div", "a", "details", "summary",
]);
const DROP_TAGS = new Set(["script", "style", "iframe", "object", "embed", "form", "input", "button", "textarea", "select", "link", "meta", "base", "svg", "math", "template", "noscript", "frame", "frameset", "img", "video", "audio", "source", "canvas"]);
const KEEP_ATTRS = new Set(["title", "colspan", "rowspan", "align", "start", "type", "open"]);
const STYLE_PROPS = new Set(["color", "background-color", "font-weight", "font-style", "text-decoration", "font-size", "text-align"]);
const SAFE_STYLE_VALUE = /^[#a-z0-9(),.%\s-]+$/i;
const SAFE_HREF = /^(https?:|mailto:|#|\/)/i;

function cleanStyle(raw: string): string {
    const out: string[] = [];
    for (const decl of raw.split(";")) {
        const index = decl.indexOf(":");
        if (index < 0) continue;
        const prop = decl.slice(0, index).trim().toLowerCase();
        const value = decl.slice(index + 1).trim();
        if (STYLE_PROPS.has(prop) && SAFE_STYLE_VALUE.test(value) && !/url|expression/i.test(value)) out.push(`${prop}: ${value}`);
    }
    return out.join("; ");
}

function copyNode(source: Node, target: Node, doc: Document) {
    for (const child of Array.from(source.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
            target.appendChild(doc.createTextNode(child.nodeValue ?? ""));
            continue;
        }
        if (child.nodeType !== Node.ELEMENT_NODE) continue;
        const el = child as Element;
        const tag = el.tagName.toLowerCase();
        if (DROP_TAGS.has(tag)) continue;
        if (!KEEP_TAGS.has(tag)) {
            copyNode(el, target, doc);
            continue;
        }
        const clean = doc.createElement(tag);
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            if (name === "style") {
                const style = cleanStyle(attr.value);
                if (style) clean.setAttribute("style", style);
            } else if (name === "href" && tag === "a") {
                if (SAFE_HREF.test(attr.value.trim())) clean.setAttribute("href", attr.value.trim());
            } else if (KEEP_ATTRS.has(name)) {
                clean.setAttribute(name, attr.value);
            }
        }
        if (tag === "a") {
            clean.setAttribute("target", "_blank");
            clean.setAttribute("rel", "noopener noreferrer nofollow");
        }
        copyNode(el, clean, doc);
        target.appendChild(clean);
    }
}

export function sanitizeHtml(html: string): string {
    const parsed = new DOMParser().parseFromString(`<!doctype html><body>${html}`, "text/html");
    const out = document.implementation.createHTMLDocument("");
    const holder = out.createElement("div");
    copyNode(parsed.body, holder, out);
    return holder.innerHTML;
}
