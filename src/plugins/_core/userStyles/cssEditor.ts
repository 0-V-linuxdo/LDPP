/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s CssEditor: a transparent textarea over a highlighted <pre> in one grid cell, so both wrap identically and
// scroll together inside the frame. The highlight is built from text nodes, never innerHTML.

import { h } from "@utils/dom";

// Numbers need a digit, so the `.` of `.class` is not painted as a number (Void++ matched `[\d.]+`).
const TOKEN = /\/\*[\s\S]*?(?:\*\/|$)|@[\w-]+|"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|[.#][A-Za-z_-][\w-]*|#[\da-fA-F]{3,8}\b|-?(?:\d+\.?\d*|\.\d+)(?:px|em|rem|%|vh|vw|vmin|vmax|s|ms|deg|fr|ch|ex)?|[\w-]+|[{}:;,()!]/g;

export function highlightCss(css: string): DocumentFragment {
    const out = document.createDocumentFragment();
    const piece = (kind: string, text: string) => out.append(h("span", { class: `ldpp-css-${kind}` }, text));
    let depth = 0;
    let afterColon = false;
    let last = 0;
    for (const match of css.matchAll(TOKEN)) {
        const index = match.index ?? 0;
        if (index > last) out.append(css.slice(last, index));
        last = index + match[0].length;
        const token = match[0];
        if (token.startsWith("/*")) { piece("com", token); afterColon = false; }
        else if (token.startsWith("@")) piece("at", token);
        else if (token === "{") { depth++; afterColon = false; piece("brace", token); }
        else if (token === "}") { depth = Math.max(0, depth - 1); afterColon = false; piece("brace", token); }
        else if (token === ":") { afterColon = depth > 0; piece("punct", token); }
        else if (token === ";" || token === ",") { afterColon = false; piece("punct", token); }
        else if ("()!".includes(token)) piece("punct", token);
        else if (token.startsWith("\"") || token.startsWith("'")) piece("str", token);
        else if ((token.startsWith(".") || token.startsWith("#")) && /^[.#][A-Za-z_-]/.test(token) && !afterColon) piece("sel", token);
        else if (token.startsWith("#") || /^-?[\d.]/.test(token)) piece("num", token);
        else if (afterColon) piece("val", token);
        else if (depth > 0) piece("prop", token);
        else piece("sel", token);
    }
    if (last < css.length) out.append(css.slice(last));
    // A trailing newline in a <pre> collapses; keep the last empty line as tall as in the textarea.
    out.append("\n");
    return out;
}

/**
 * Void++ `formatCss`: expands a one-line rule pasted from devtools into one declaration per line. A colon followed by
 * `{` before the next `;`/`}` belongs to a selector (`a:hover`), so it is kept as-is instead of becoming `a: hover`.
 */
export function formatCss(raw: string): string {
    const tokens = raw.replaceAll(/\s+/g, " ").trim().split(/(?=[{}:;])|(?<=[{}:;])/g).map(part => part.trim()).filter(Boolean);
    const inSelector = (from: number) => {
        for (let i = from; i < tokens.length; i++) {
            if (tokens[i] === "{") return true;
            if (tokens[i] === ";" || tokens[i] === "}") return false;
        }
        return false;
    };
    let out = "";
    let indent = 0;
    let glue = false;
    const pad = () => "    ".repeat(indent);
    tokens.forEach((token, index) => {
        if (token === "{") { out += " {\n"; indent++; }
        else if (token === "}") {
            if (!out.endsWith("\n")) out += ";\n";
            indent = Math.max(0, indent - 1);
            out += `${pad()}}\n\n`;
        } else if (token === ";") out += ";\n";
        else if (token === ":") {
            glue = inSelector(index);
            out += glue ? ":" : ": ";
        } else {
            out += out === "" || out.endsWith("\n") ? pad() + token : glue ? token : out.endsWith(" ") ? token : ` ${token}`;
            glue = false;
        }
    });
    return `${out.replaceAll(/\n{3,}/g, "\n\n").trim()}\n`;
}

export interface CssEditorOptions {
    value: string;
    placeholder?: string;
    disabled?: boolean;
    onChange(value: string): void;
}

export interface CssEditorHandle {
    el: HTMLElement;
    textarea: HTMLTextAreaElement;
    setDisabled(disabled: boolean): void;
}

export function CssEditor({ value, placeholder, disabled, onChange }: CssEditorOptions): CssEditorHandle {
    const highlight = h("pre", { class: "ldpp-css-highlight", attrs: { "aria-hidden": "true" } });
    const textarea = h("textarea", { class: "ldpp-css-input", value, placeholder: placeholder ?? "", spellcheck: false, attrs: { autocomplete: "off", autocorrect: "off", autocapitalize: "off", "aria-label": placeholder ?? "CSS" } });
    const el = h("div", { class: "ldpp-css-wrap" }, highlight, textarea);
    const paint = () => highlight.replaceChildren(highlightCss(textarea.value));
    textarea.addEventListener("input", () => {
        paint();
        onChange(textarea.value);
    });
    textarea.addEventListener("paste", event => {
        const pasted = event.clipboardData?.getData("text/plain") ?? "";
        if (!pasted.includes("{") || pasted.includes("\n")) return;
        event.preventDefault();
        const { selectionStart: start, selectionEnd: end } = textarea;
        const formatted = formatCss(pasted);
        textarea.value = textarea.value.slice(0, start) + formatted + textarea.value.slice(end);
        textarea.selectionStart = textarea.selectionEnd = start + formatted.length;
        textarea.dispatchEvent(new Event("input"));
    });
    const setDisabled = (next: boolean) => {
        textarea.disabled = next;
        el.classList.toggle("is-disabled", next);
    };
    setDisabled(Boolean(disabled));
    paint();
    return { el, textarea, setDisabled };
}
