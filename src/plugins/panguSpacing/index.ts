/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「中英文混排优化显示」 from the unmaintained linuxdo-scripts (anghunk; MenuPangu): pangu.js puts a space between Chinese
// and Latin letters or digits in post bodies (.cooked) and titles (h1), and the composer gets the original's 「混排优化」
// button after 「创建话题 / 回复」, which does the same to what is being written.
//
// The original re-scanned every second with pangu 4; this uses the maintained pangu.js (10.x), which skips code,
// inputs and editable areas, and only spaces what changed. The composer button keeps Markdown syntax intact (code,
// link targets, images, Discourse tags and emoji codes come out byte for byte) and edits through insertText, so the
// change is one undo step instead of the original's character-by-character retyping.

import { showToast } from "@api/Notifications";
import { LanguagesIcon } from "@components/icons";
import { h, isOwnNode, mark } from "@utils/dom";
import definePlugin from "@utils/types";
import { pangu } from "pangu/browser";

const SCOPE = ".cooked, h1";
/** The composer preview shows what will be posted; spacing it would show text the post does not have. */
const SKIP = ".d-editor-preview";
const BUTTON = "ldpp-pangu-button";

/*
 * Markdown spans kept byte for byte. Inline code and bare links become a word-like token, so pangu still spaces
 * around them (「用`npm`安装」 → 「用 `npm` 安装」); the others become private-use characters pangu leaves alone.
 */
const PROTECTED: Array<[RegExp, boolean]> = [
    [/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^\1[ \t]*$|(?![\s\S]))/gm, false],
    [/`[^`\n]+`/g, true],
    [/!\[[^\]\n]*\]\([^)\n]*\)/g, false],
    [/\]\([^)\n]*\)/g, false],
    [/https?:\/\/[\w\-.~:/?#@!$&'*+,;=%]+/g, true],
    [/<\/?[a-z][^>\n]*>/gi, false],
    [/\[\/?[a-z]+(?:[= ][^\]\n]*)?\]/gi, false],
    [/:[a-z0-9_+-]+:/g, false],
];

const WORD_TOKEN = /ldppz(\d+)z/g;
const MARK_START = "";
const MARK_END = "";
const MARK_TOKEN = new RegExp(`${MARK_START}([-]+)${MARK_END}`, "g");

const markOf = (index: number) => MARK_START + [...String(index)].map(digit => String.fromCharCode(0xE000 + Number(digit))).join("") + MARK_END;
const indexOf = (digits: string) => Number([...digits].map(char => char.charCodeAt(0) - 0xE000).join(""));

/** pangu for Markdown: spaces the prose, leaves code, link targets, images, Discourse tags and emoji codes as they are. */
export function spaceMarkdown(text: string): string {
    const kept: string[] = [];
    let masked = text;
    for (const [pattern, spaced] of PROTECTED) {
        masked = masked.replace(pattern, match => {
            kept.push(match);
            return spaced ? `ldppz${kept.length - 1}z` : markOf(kept.length - 1);
        });
    }
    let result = pangu.spaceText(masked);
    // A span can hold the token of one masked before it (a link inside an HTML tag), so restore until none is left.
    for (let round = 0; round < PROTECTED.length; round++) {
        const restored = result.replace(WORD_TOKEN, (_, index: string) => kept[Number(index)] ?? "").replace(MARK_TOKEN, (_, digits: string) => kept[indexOf(digits)] ?? "");
        if (restored === result) break;
        result = restored;
    }
    return result;
}

function replaceValue(field: HTMLInputElement | HTMLTextAreaElement, next: string) {
    field.focus();
    field.select();
    // insertText keeps the browser's undo history and fires the input event Discourse listens to; where it is not
    // supported (or reports success without editing) the value is set directly.
    try { document.execCommand("insertText", false, next); } catch { /* not available: set below */ }
    if (field.value !== next) {
        field.value = next;
        field.dispatchEvent(new Event("input", { bubbles: true }));
    }
}

function spaceComposer() {
    const editor = document.querySelector("#reply-control .d-editor-input");
    if (!(editor instanceof HTMLTextAreaElement)) {
        showToast("富文本模式下不能自动混排，请先切换到 Markdown 模式。", "warning", { key: "pangu-composer" });
        return;
    }
    const title = document.querySelector<HTMLInputElement>("#reply-control #reply-title");
    let changed = false;
    if (title && !title.disabled && title.value) {
        const next = pangu.spaceText(title.value);
        if (next !== title.value) {
            replaceValue(title, next);
            changed = true;
        }
    }
    const next = spaceMarkdown(editor.value);
    if (next !== editor.value) {
        replaceValue(editor, next);
        changed = true;
    }
    if (!changed) showToast("没有需要加空格的地方。", "info", { key: "pangu-composer" });
}

/** The original's button, after the composer's 「创建话题 / 回复」. */
function ensureButton() {
    const create = document.querySelector("#reply-control .save-or-cancel .create");
    if (!create || create.parentElement?.querySelector(`:scope > .${BUTTON}`)) return;
    const button = mark(h("button", {
        type: "button",
        class: `btn ${BUTTON}`,
        title: "在中文与英文、数字之间加上空格（代码、链接地址保持不变）",
        on: { click: spaceComposer },
    }, h("span", { class: "d-button-label" }, "混排优化")), "pangu-button");
    create.after(button);
}

let observer: MutationObserver | null = null;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
const pending = new Set<Element>();

function addRoot(el: Element | null | undefined) {
    if (!el || el.closest(SKIP) || isOwnNode(el)) return;
    pending.add(el);
}

function collect(node: Node) {
    if (node instanceof Element) {
        const root = node.closest(SCOPE);
        if (root) addRoot(root);
        else for (const inner of node.querySelectorAll(SCOPE)) addRoot(inner);
    } else if (node.parentElement) {
        addRoot(node.parentElement.closest(SCOPE));
    }
}

function flush() {
    flushTimer = undefined;
    for (const root of pending) if (root.isConnected) pangu.spaceNode(root);
    pending.clear();
    ensureButton();
}

function onMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
        if (mutation.type === "characterData") collect(mutation.target);
        else for (const node of mutation.addedNodes) collect(node);
    }
    // pangu's own edits come back here once; spacing spaced text changes nothing, so it settles.
    flushTimer ??= setTimeout(flush, 100);
}

export default definePlugin({
    name: "PanguSpacing",
    displayName: "中英文混排优化",
    description: "在帖子正文与标题的中文和英文、数字之间自动加空格；编辑器里的「混排优化」按钮可整理正在写的内容（来自 linuxdo-scripts）。",
    tags: ["reading"],
    icon: LanguagesIcon,
    enabledByDefault: true,
    start() {
        observer = new MutationObserver(onMutations);
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        collect(document.documentElement);
        flush();
    },
    stop() {
        observer?.disconnect();
        observer = null;
        clearTimeout(flushTimer);
        flushTimer = undefined;
        pending.clear();
        for (const button of document.querySelectorAll(`.${BUTTON}`)) button.remove();
    },
});
