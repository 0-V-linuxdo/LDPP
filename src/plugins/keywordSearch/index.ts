/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「关键词搜索增强」 from the user's 「[LINUX DO] Keywords Search Enhanced」 userscript: saved search keywords (each with
// its own search order) and saved links, behind the old 🏷️ button in the site's search box. The panel opens under
// the search box as before, with the 关键词 / 链接 tabs; a chip searches or opens, its ✎ edits it.
//
// Differences from the script: the 🏷️ sits in the search box's own button row (the welcome banner) or beside its
// clear button (the search page) instead of wrapping Discourse's input in a new element; the panel's 新增 / 设置
// are in its header instead of round buttons floating beside it; editing uses LD++ dialogs; settings (default
// order, badge colours, import / export of the script's file) are in LD++'s settings.

import "./styles.css";

import { openDialog } from "@api/Dialog";
import { dispatch } from "@api/Events";
import { routeTo } from "@api/Navigation";
import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button, Field, IconButton, InfoTip, Select, TextInput } from "@components/controls";
import { LinkIcon, PencilIcon, PlusIcon, SearchIcon, SettingsIcon, TagIcon } from "@components/icons";
import { classes } from "@utils/css";
import { h, mark } from "@utils/dom";
import { downloadJson, errorMessage, isAbortError, pickJsonFile, todayStamp } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

import { type KeywordEntry, linkLabel, type LinkEntry, normalizeKeywords, normalizeLinks, normalizeSort, parseKeywordExport, resolveLink, searchPath, SORT_OPTIONS, sortOption, toExport } from "./model";

export * from "./model";

const TOGGLE = "ldpp-kws-toggle";
/** The old script's own button; while it is there both stacks would paint a 🏷️. */
const LEGACY_BUTTON = "#ld-kse-keyword-tag-button";

export const settings = definePluginSettings({
    keywords: { type: OptionType.CUSTOM, default: [] as KeywordEntry[] },
    links: { type: OptionType.CUSTOM, default: [] as LinkEntry[] },
    sortColors: { type: OptionType.CUSTOM, default: {} as Record<string, string> },
    defaultSort: {
        type: OptionType.SELECT,
        description: "新增关键词时的默认排序",
        options: SORT_OPTIONS.map(option => ({ label: option.name, value: option.id, default: option.id === "relevance" })),
    },
    colors: {
        type: OptionType.COMPONENT,
        description: "排序标签颜色",
        render: () => renderColors(),
    },
    data: {
        type: OptionType.COMPONENT,
        description: "导入 / 导出",
        render: () => renderDataTools(),
    },
});

const keywords = () => normalizeKeywords(settings.store.keywords);
const links = () => normalizeLinks(settings.store.links);
const saveKeywords = (next: KeywordEntry[]) => { settings.store.keywords = normalizeKeywords(next); };
const saveLinks = (next: LinkEntry[]) => { settings.store.links = normalizeLinks(next); };

export function sortColor(id: string): string {
    const custom = (settings.store.sortColors as Record<string, string> | undefined)?.[id];
    return typeof custom === "string" && /^#[\da-f]{6}$/i.test(custom) ? custom : sortOption(id).color;
}

function badge(id: string): HTMLElement {
    return h("span", { class: "ldpp-kws-badge", style: { "background-color": sortColor(id) } }, sortOption(id).name);
}

/* ------------------------------------------------------------------ panel */

type Tab = "keywords" | "links";
let tab: Tab = "keywords";
let panel: HTMLElement | null = null;
let anchor: HTMLElement | null = null;

function go(path: string) {
    closePanel();
    const url = new URL(path, location.origin);
    if (url.origin === location.origin) routeTo(url.pathname + url.search + url.hash);
    else location.assign(url.href);
}

function chip(main: HTMLElement, onEdit: () => void, editTitle: string): HTMLElement {
    return h("li", { class: "ldpp-kws-chip" },
        main,
        IconButton(PencilIcon(12), { title: editTitle, className: "ldpp-kws-chip-edit", onClick: onEdit }),
    );
}

function renderList(): HTMLElement {
    if (tab === "keywords") {
        const list = keywords();
        if (!list.length) return h("p", { class: "ldpp-kws-empty" }, "还没有关键词。点右上角 ＋ 添加，或在设置里导入旧脚本导出的文件。");
        return h("ul", { class: "ldpp-kws-chips" }, list.map((entry, index) => chip(
            h("button", { type: "button", class: "ldpp-kws-chip-main", title: `搜索「${entry.keyword}」（${sortOption(entry.sort).name}）`, on: { click: () => go(searchPath(entry)) } },
                h("span", { class: "ldpp-kws-chip-text" }, `🔍 ${entry.keyword}`), badge(entry.sort)),
            () => editKeyword(index), "编辑关键词",
        )));
    }
    const list = links();
    if (!list.length) return h("p", { class: "ldpp-kws-empty" }, "还没有链接。点右上角 ＋ 把当前页面或任意地址加进来。");
    return h("ul", { class: "ldpp-kws-chips" }, list.map((entry, index) => {
        const href = resolveLink(entry.url);
        return chip(
            h("button", { type: "button", class: "ldpp-kws-chip-main", title: href || "链接无效", disabled: !href, on: { click: () => go(href) } },
                h("span", { class: "ldpp-kws-chip-text" }, `🔗 ${linkLabel(entry)}`)),
            () => editLink(index), "编辑链接",
        );
    }));
}

function renderPanel() {
    if (!panel) return;
    const tabButton = (id: Tab, label: string, count: number) => h("button", {
        type: "button",
        class: classes("ldpp-kws-tab", tab === id && "is-active"),
        attrs: { role: "tab", "aria-selected": String(tab === id) },
        on: { click: () => { tab = id; renderPanel(); } },
    }, label, count ? h("span", { class: "ldpp-kws-count" }, String(count)) : null);
    panel.replaceChildren(
        h("div", { class: "ldpp-kws-head" },
            h("div", { class: "ldpp-kws-tabs", attrs: { role: "tablist" } }, tabButton("keywords", "关键词", keywords().length), tabButton("links", "链接", links().length)),
            IconButton(PlusIcon(16), { title: tab === "keywords" ? "新增关键词" : "新增链接", onClick: () => (tab === "keywords" ? editKeyword(-1) : editLink(-1)) }),
            IconButton(SettingsIcon(16), { title: "设置", onClick: () => { closePanel(); dispatch("openSettings", { tab: "features", plugin: "KeywordSearch" }); } }),
        ),
        renderList(),
    );
}

/** Under the search box, as wide as it (at least 20rem, never past the window). */
function placePanel() {
    if (!panel || !anchor?.isConnected) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 320), window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - width - 16);
    panel.style.width = `${width}px`;
    panel.style.left = `${left + window.scrollX}px`;
    panel.style.top = `${rect.bottom + window.scrollY + 8}px`;
}

function openPanel(from: HTMLElement) {
    anchor = from.closest<HTMLElement>(".search-input, .search-bar") ?? from;
    panel ??= mark(h("section", { class: "ldpp-kws-panel", attrs: { "aria-label": "常用关键词与链接" } }), "keyword-search");
    if (!panel.isConnected) document.body.append(panel);
    renderPanel();
    placePanel();
    syncToggles();
}

export function closePanel() {
    panel?.remove();
    panel = null;
    syncToggles();
}

function syncToggles() {
    for (const toggle of document.querySelectorAll(`.${TOGGLE}`)) toggle.setAttribute("aria-expanded", String(Boolean(panel)));
}

function onToggle(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (panel) closePanel();
    else openPanel(event.currentTarget as HTMLElement);
}

/* -------------------------------------------------------------- editing */

function editKeyword(index: number) {
    const list = keywords();
    const current = list[index];
    let keyword = current?.keyword ?? "";
    let sort = current?.sort ?? normalizeSort(settings.store.defaultSort);
    const input = TextInput({ value: keyword, placeholder: "关键词", onInput: value => { keyword = value; } }) as HTMLInputElement;
    const save = () => {
        const value = keyword.trim();
        if (!value) {
            showToast("关键词不能为空", "warning");
            return false;
        }
        if (list.some((entry, i) => i !== index && entry.keyword === value && entry.sort === sort)) {
            showToast("相同排序下已经有这个关键词", "warning");
            return false;
        }
        const next = [...list];
        if (current) next[index] = { keyword: value, sort };
        else next.push({ keyword: value, sort });
        saveKeywords(next);
        renderPanel();
        return true;
    };
    const handle = openDialog({
        title: current ? "编辑关键词" : "新增关键词",
        icon: SearchIcon(18),
        size: "small",
        body: [
            Field("关键词", input),
            Field("排序", Select(sort, SORT_OPTIONS.map(option => ({ label: option.name, value: option.id })), value => { sort = normalizeSort(value); })),
        ],
        actions: [
            ...(current ? [{ label: "删除", kind: "delete" as const, onClick: () => { saveKeywords(list.filter((_, i) => i !== index)); renderPanel(); } }] : []),
            { label: "取消" },
            { label: current ? "保存" : "新增", kind: "primary", onClick: save },
        ],
    });
    input.addEventListener("keydown", event => {
        if (event.key === "Enter" && !event.isComposing && save()) handle.close();
    });
    requestAnimationFrame(() => input.focus());
}

const pageTitle = () => document.title.replace(/\s*-\s*LINUX DO\s*$/i, "").trim();

function editLink(index: number) {
    const list = links();
    const current = list[index];
    let label = current?.label ?? "";
    let url = current?.url ?? location.href;
    const labelInput = TextInput({ value: label, placeholder: current ? "可选" : pageTitle() || "可选", onInput: value => { label = value; } }) as HTMLInputElement;
    const urlInput = TextInput({ value: url, placeholder: "网址、域名或站内路径", onInput: value => { url = value; } }) as HTMLInputElement;
    const save = () => {
        const href = resolveLink(url);
        if (!href) {
            showToast(url.trim() ? "请输入有效的链接地址" : "链接地址不能为空", "warning");
            return false;
        }
        if (list.some((entry, i) => i !== index && resolveLink(entry.url) === href)) {
            showToast("这个链接已经存在", "warning");
            return false;
        }
        // A new link of the page being viewed takes the page's title, as the script did.
        const name = label.trim() || (!current && href === resolveLink(location.href) ? pageTitle() : "");
        const next = [...list];
        if (current) next[index] = { label: name, url: url.trim() };
        else next.push({ label: name, url: url.trim() });
        saveLinks(next);
        renderPanel();
        return true;
    };
    const handle = openDialog({
        title: current ? "编辑链接" : "新增链接",
        icon: LinkIcon(18),
        size: "small",
        body: [Field("标签", labelInput), Field("链接地址", urlInput)],
        actions: [
            ...(current ? [{ label: "删除", kind: "delete" as const, onClick: () => { saveLinks(list.filter((_, i) => i !== index)); renderPanel(); } }] : []),
            { label: "取消" },
            { label: current ? "保存" : "新增", kind: "primary", onClick: save },
        ],
    });
    for (const input of [labelInput, urlInput]) {
        input.addEventListener("keydown", event => {
            if (event.key === "Enter" && !event.isComposing && save()) handle.close();
        });
    }
    requestAnimationFrame(() => {
        urlInput.focus();
        urlInput.select();
    });
}

/* ------------------------------------------------------------- settings */

function renderColors(): HTMLElement {
    const root = h("div", { class: "ldpp-kws-colors" });
    const render = () => {
        root.replaceChildren(
            ...SORT_OPTIONS.map(option => {
                // The script's preview: a chip outlined in the colour, 「🔍 颜色预览」 and the badge filled with it.
                const tag = badge(option.id);
                const preview = h("span", { class: "ldpp-kws-preview", style: { "border-color": sortColor(option.id) } }, h("span", null, "🔍 颜色预览"), tag);
                const picker = h("input", { type: "color", class: "ldpp-color-swatch", value: sortColor(option.id), title: `${option.name}的颜色` });
                picker.addEventListener("input", () => {
                    preview.style.borderColor = picker.value;
                    tag.style.backgroundColor = picker.value;
                });
                picker.addEventListener("change", () => {
                    settings.store.sortColors = { ...(settings.store.sortColors as Record<string, string>), [option.id]: picker.value };
                    if (panel) renderPanel();
                });
                return Field(option.name, h("span", { class: "ldpp-field-control ldpp-kws-color" }, preview, picker));
            }),
            h("div", { class: "ldpp-row-actions" }, Button("恢复默认颜色", { small: true, onClick: () => { settings.store.sortColors = {}; render(); if (panel) renderPanel(); } })),
        );
    };
    render();
    // The sub-tab already reads 「排序标签颜色」: no heading of its own.
    return root;
}

/** Lists from a file: the old script's export (merged into what is here) or LD++'s own export of this plugin. */
export function importKeywordFile(raw: unknown): { keywords: number; links: number } | null {
    const parsed = parseKeywordExport(raw);
    if (!parsed) return null;
    const before = { keywords: keywords().length, links: links().length };
    if (parsed.keywords) saveKeywords([...keywords(), ...parsed.keywords]);
    if (parsed.links) saveLinks([...links(), ...parsed.links]);
    return { keywords: keywords().length - before.keywords, links: links().length - before.links };
}

async function importFromFile() {
    let raw: unknown;
    try {
        raw = await pickJsonFile();
    } catch (error) {
        if (!isAbortError(error)) showToast(errorMessage(error), "warning");
        return;
    }
    const added = importKeywordFile(raw);
    if (!added) {
        showToast("无法识别的文件：不是「Keywords Search Enhanced」或 LD++ 导出的关键词文件", "error");
        return;
    }
    showToast(`导入完成：新增 ${added.keywords} 个关键词、${added.links} 个链接（重复的已跳过）`, "success");
    if (panel) renderPanel();
}

function exportToFile() {
    downloadJson(toExport(keywords(), links()), `linuxdo_Keywords_Search_${todayStamp()}.json`);
}

function renderDataTools(): HTMLElement {
    return Field("关键词与链接文件", h("span", { class: "ldpp-inline-controls" },
        Button("导入", { small: true, onClick: () => void importFromFile() }),
        Button("导出", { small: true, onClick: exportToFile }),
        InfoTip("文件格式与原脚本「Keywords Search Enhanced」的导出文件相同，两边可以互相导入。导入时与现有列表合并，重复的关键词（同一排序）和链接会跳过。"),
    ));
}

/* --------------------------------------------------------- search boxes */

/** The welcome banner's box: next to its 高级搜索 button. The search page's box: inside the field, left of its clear ×. */
function placeToggles() {
    for (const row of document.querySelectorAll<HTMLElement>(".search-input .searching")) {
        if (row.querySelector(`:scope > .${TOGGLE}`)) continue;
        row.insertBefore(toggleButton("btn no-text btn-icon btn-transparent"), row.querySelector(":scope > .show-advanced-search"));
    }
    for (const field of document.querySelectorAll<HTMLElement>(".search-bar__field")) {
        if (!field.querySelector(`:scope > .${TOGGLE}`)) field.append(toggleButton("btn no-text btn-icon btn-transparent is-in-field"));
    }
    if (!warnedLegacy && document.querySelector(LEGACY_BUTTON)) {
        warnedLegacy = true;
        showToast("「Keywords Search Enhanced」脚本仍在运行，搜索框里会出现两个 🏷️。LD++ 已内置这个功能：先用旧脚本导出数据，在 LD++ 设置里导入，再停用旧脚本。", "warning", { key: "keyword-search-legacy" });
    }
}

function toggleButton(className: string): HTMLButtonElement {
    return mark(h("button", {
        type: "button",
        class: `${className} ${TOGGLE}`,
        title: "常用关键词与链接",
        attrs: { "aria-label": "常用关键词与链接", "aria-expanded": String(Boolean(panel)) },
        on: { click: onToggle },
    }, "🏷️"), "keyword-search-toggle");
}

let warnedLegacy = false;
let observer: MutationObserver | null = null;
let listeners: AbortController | null = null;
let frame = 0;

function schedule() {
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; placeToggles(); });
}

/** Clicks anywhere else close the panel, except in its dialogs (editing a chip) and on the 🏷️ itself. */
function onPointerDown(event: PointerEvent) {
    if (!panel || !(event.target instanceof Element)) return;
    if (event.target.closest(`.ldpp-kws-panel, .${TOGGLE}, .ldpp-dialog-overlay, .ldpp-toasts`)) return;
    closePanel();
}

export default definePlugin({
    name: "KeywordSearch",
    displayName: "关键词搜索增强",
    description: "把常搜的关键词（各带一种排序）和常用链接存起来，点搜索框里的 🏷️ 一键搜索、快速打开；支持导入 / 导出原脚本的文件。",
    tags: ["search"],
    icon: TagIcon,
    enabledByDefault: true,
    settings,
    start() {
        listeners = new AbortController();
        document.addEventListener("pointerdown", onPointerDown, { capture: true, signal: listeners.signal });
        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && panel && !document.querySelector(".ldpp-dialog-overlay")) closePanel();
        }, { signal: listeners.signal });
        window.addEventListener("resize", placePanel, { signal: listeners.signal });
        observer = new MutationObserver(schedule);
        observer.observe(document.body, { childList: true, subtree: true });
        placeToggles();
    },
    stop() {
        observer?.disconnect();
        observer = null;
        listeners?.abort();
        listeners = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        closePanel();
        for (const toggle of document.querySelectorAll(`.${TOGGLE}`)) toggle.remove();
    },
    onSettingsChange() {
        if (panel) renderPanel();
    },
    events: {
        navigate() {
            closePanel();
            schedule();
        },
    },
});
