/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The tab names of the 「[LINUX DO] Clean Navigation」 user style: each navigation tab (最新, 新, 未读 …) can carry its own
// name, say 「最新 (Latest)」, and a small subtitle above it in its own colour.
//
// The style drew the name with `font-size: 0` on the tab and a ::before, which also hid the site's count 「新 (442)」,
// and placed the subtitle with offsets tuned by hand for each tab. Here the count is copied into an attribute of the
// tab's link and drawn after the new name, and the subtitle sits at the link's own left padding, so no tab needs its
// own offset. The links' text stays as Discourse rendered it: only an attribute is added, never a node.

import { definePluginSettings } from "@api/Settings";
import { Button, Field, Select, SubTabs, TextInput } from "@components/controls";
import { TypeIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import { h } from "@utils/dom";
import definePlugin, { OptionType } from "@utils/types";

const STYLE = "navLabels";
const COUNT_ATTR = "data-ldpp-count";

export interface TabLabel {
    /** Replaces the site's name; empty keeps it. */
    name: string;
    /** The small text above the name; empty shows none. */
    sub: string;
    /** The subtitle's colour (#rrggbb); empty follows the site's. */
    color: string;
}

/** The tabs, with the name linux.do gives each in Chinese, and the style's defaults. */
export const TABS = [
    { id: "latest", site: "最新", label: { name: "最新 (Latest)", sub: "帖子", color: "#0000ff" } },
    { id: "new", site: "新", label: { name: "新 (Created)", sub: "话题", color: "#ff0000" } },
    { id: "unread", site: "未读（Unread）", label: { name: "未读 (Unread)", sub: "帖子", color: "#0000ff" } },
    { id: "unseen", site: "未读（Unseen）", label: { name: "未读 (Unseen)", sub: "帖子 + 话题", color: "" } },
    { id: "top", site: "排行榜", label: { name: "活跃 (Top)", sub: "话题", color: "" } },
    { id: "hot", site: "热门", label: { name: "热门 (Hot)", sub: "话题", color: "" } },
    { id: "categories", site: "类别", label: { name: "类别 (Categories)", sub: "分组", color: "" } },
    { id: "bookmarks", site: "书签", label: { name: "我的书签 (Bookmarks)", sub: "话题", color: "" } },
    { id: "posted", site: "我的帖子", label: { name: "", sub: "", color: "" } },
    { id: "read", site: "已读", label: { name: "", sub: "", color: "" } },
] as const satisfies ReadonlyArray<{ id: string; site: string; label: TabLabel }>;

export type TabId = typeof TABS[number]["id"];

export const settings = definePluginSettings({
    labels: { type: OptionType.CUSTOM, default: {} as Partial<Record<TabId, Partial<TabLabel>>> },
    editor: {
        type: OptionType.COMPONENT,
        description: "导航标签",
        render: () => renderEditor(),
    },
});

const HEX = /^#[\da-f]{6}$/i;

/** A tab's label: what the user set over the style's default. */
export function tabLabel(id: TabId): TabLabel {
    const stored = (settings.store.labels as Partial<Record<TabId, Partial<TabLabel>>> | undefined)?.[id] ?? {};
    const base = TABS.find(tab => tab.id === id)!.label;
    const pick = (key: keyof TabLabel) => typeof stored[key] === "string" ? stored[key] : base[key];
    return { name: pick("name").trim(), sub: pick("sub").trim(), color: HEX.test(pick("color")) ? pick("color") : "" };
}

function setTabLabel(id: TabId, patch: Partial<TabLabel>) {
    const labels = (settings.store.labels ?? {}) as Partial<Record<TabId, Partial<TabLabel>>>;
    settings.store.labels = { ...labels, [id]: { ...tabLabel(id), ...patch } };
}

/** A CSS string literal of user text. */
export function cssString(text: string): string {
    return `"${text.replaceAll(/[\\"]/g, "\\$&").replaceAll(/[\r\n]+/g, " ")}"`;
}

/** The stylesheet for the given labels; empty when no tab is changed. */
export function labelsCss(labels: ReadonlyArray<[TabId, TabLabel]>): string {
    const rules: string[] = [];
    for (const [id, { name, sub, color }] of labels) {
        const link = `#navigation-bar > li.nav-item_${id} > a`;
        if (!name && !sub) continue;
        rules.push(`${link} {
    position: relative;${name ? "\n    font-size: 0 !important;" : ""}
}`);
        if (name) rules.push(`${link}::before {
    content: ${cssString(name)} attr(${COUNT_ATTR});
    font-size: 1rem;
    padding: 0 0.65rem;
    white-space: nowrap;
}`);
        if (sub) rules.push(`${link}::after {
    content: ${cssString(sub)};
    position: absolute;
    top: 0;
    left: 0.65rem;
    font-size: 0.625rem;
    line-height: 1.2;
    white-space: nowrap;
    pointer-events: none;${color ? `\n    color: ${color};` : ""}
}`);
    }
    return rules.join("\n");
}

/** The count Discourse shows after a tab's name, 「新 (442)」 → 「 (442)」. */
export function tabCount(text: string): string {
    const match = text.trim().match(/\((\d+)\)$/);
    return match ? ` (${match[1]})` : "";
}

/** Copies each tab's count into its link, for the renamed tab to show. */
export function syncCounts(root: ParentNode = document) {
    for (const link of root.querySelectorAll<HTMLAnchorElement>("#navigation-bar > li > a")) {
        const count = tabCount(link.textContent ?? "");
        if (count) {
            if (link.getAttribute(COUNT_ATTR) !== count) link.setAttribute(COUNT_ATTR, count);
        } else if (link.hasAttribute(COUNT_ATTR)) link.removeAttribute(COUNT_ATTR);
    }
}

let active = false;
let observer: MutationObserver | null = null;
let frame = 0;

function watchCounts(on: boolean) {
    if (on && !observer) {
        observer = new MutationObserver(() => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                syncCounts();
            });
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        syncCounts();
    } else if (!on && observer) {
        observer.disconnect();
        observer = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        for (const link of document.querySelectorAll(`[${COUNT_ATTR}]`)) link.removeAttribute(COUNT_ATTR);
    }
}

function apply() {
    const labels = TABS.map(tab => [tab.id, tabLabel(tab.id)] as [TabId, TabLabel]);
    const css = active ? labelsCss(labels) : "";
    if (css) registerStyle(STYLE, css);
    else unregisterStyle(STYLE);
    watchCounts(active && labels.some(([, label]) => label.name));
}

/* ------------------------------------------------------------- settings */

function renderEditor(): HTMLElement {
    const root = h("div", { class: "ldpp-nav-labels" });
    const render = () => {
        const tabs = SubTabs(TABS.map(tab => ({
            label: () => tab.site,
            render: () => {
                const label = tabLabel(tab.id);
                const picker = h("input", { type: "color", class: "ldpp-nav-labels-color", value: label.color || "#666666", title: "副标题颜色", hidden: !label.color });
                picker.addEventListener("change", () => setTabLabel(tab.id, { color: picker.value }));
                const mode = Select(label.color ? "custom" : "site", [
                    { label: "跟随站点", value: "site" },
                    { label: "自定义颜色", value: "custom" },
                ], value => {
                    picker.hidden = value !== "custom";
                    setTabLabel(tab.id, { color: value === "custom" ? picker.value : "" });
                });
                return h("div", null,
                    Field("名称", TextInput({ value: label.name, placeholder: `留空保留「${tab.site}」`, onChange: name => setTabLabel(tab.id, { name }) }), "站点显示的未读数等计数会接在名称后面。"),
                    Field("副标题", TextInput({ value: label.sub, placeholder: "留空不显示", onChange: sub => setTabLabel(tab.id, { sub }) })),
                    Field("副标题颜色", h("span", { class: "ldpp-field-control ldpp-nav-labels-color-row" }, mode, picker)),
                );
            },
        })));
        root.replaceChildren(
            tabs.el,
            h("div", { class: "ldpp-row-actions" }, Button("全部恢复默认", { small: true, onClick: () => { settings.store.labels = {}; render(); } })),
        );
    };
    render();
    return root;
}

export default definePlugin({
    name: "NavLabels",
    displayName: "导航标签自定义",
    description: "给「最新」「新」「未读」等导航标签换名称（如中英对照），并在上方加一行小字副标题，颜色可跟随站点或自定义（来自「Clean Navigation」样式）。",
    tags: ["reading"],
    icon: TypeIcon,
    enabledByDefault: false,
    settings,
    start() {
        active = true;
        apply();
    },
    stop() {
        active = false;
        apply();
    },
    onSettingsChange: apply,
});
