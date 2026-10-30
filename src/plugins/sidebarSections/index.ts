/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Sidebar sections that open the way the user chose, after Void++'s BetterSidebar (botsDefaultCollapsed,
// chatsDefaultExpanded, projectsDefaultCollapsed, titleRowHover, defaultCollapsed).
//
// Discourse remembers each section in localStorage as discourse_sidebar-section-<name>-collapsed ("true" / "false")
// and reads it when the section is drawn. This runs at document-start, so writing the keys first lets the sidebar come
// up in the chosen state without a flash. A section that is drawn before that (or one first seen on this load, such as
// a new custom section) is set once by clicking its header, which Discourse then remembers too. Each section is set
// once per page load: what the user opens or closes afterwards stays as it is.

import { definePluginSettings } from "@api/Settings";
import { SidebarIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import { onReady } from "@utils/dom";
import definePlugin, { OptionType, StartAt } from "@utils/types";

export type SectionState = "keep" | "expand" | "collapse";
export type SectionKind = "community" | "categories" | "tags" | "messages" | "other";

const KEY_PREFIX = "discourse_sidebar-section-";
const KEY_SUFFIX = "-collapsed";
const STYLE = "sidebarSections-hover";

const HOVER_CSS = `.sidebar-section .sidebar-section-header-wrapper .sidebar-section-header-button {
    opacity: 0;
    transition: opacity 0.15s;
}
.sidebar-section:hover .sidebar-section-header-wrapper .sidebar-section-header-button,
.sidebar-section .sidebar-section-header-wrapper .sidebar-section-header-button:focus-visible {
    opacity: 1;
}
@media (hover: none) {
    .sidebar-section .sidebar-section-header-wrapper .sidebar-section-header-button {
        opacity: 1;
    }
}`;

const stateSetting = (description: string, initial: SectionState) => ({
    type: OptionType.SELECT as const,
    description,
    options: [
        { label: "保持站点记忆的状态", value: "keep", default: initial === "keep" },
        { label: "展开", value: "expand", default: initial === "expand" },
        { label: "折叠", value: "collapse", default: initial === "collapse" },
    ],
});

export const settings = definePluginSettings({
    community: stateSetting("「社区」分区（最新、我的帖子等）", "keep"),
    categories: stateSetting("「类别」分区", "expand"),
    tags: stateSetting("「标签」分区", "collapse"),
    messages: stateSetting("「私信」分区", "keep"),
    other: stateSetting("其他分区（自定义分区、聊天频道等）", "keep"),
    headerHover: {
        type: OptionType.BOOLEAN,
        description: "分区标题旁的编辑按钮只在悬停该分区时显示",
        default: true,
    },
    startCollapsed: {
        type: OptionType.BOOLEAN,
        description: "打开页面时收起整个侧栏（仅桌面版，之后可用顶栏的 ☰ 展开）",
        default: false,
    },
});

export function sectionKind(name: string): SectionKind {
    return name === "community" || name === "categories" || name === "tags" || name === "messages" ? name : "other";
}

export function wantedState(name: string): SectionState {
    return (settings.store[sectionKind(name)] as SectionState | undefined) ?? "keep";
}

/** Writes Discourse's remembered state for the named sections, and for every custom section it has remembered before. */
export function presetStorage(names: readonly string[] = ["community", "categories", "tags", "messages"]) {
    const all = new Set(names);
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(KEY_PREFIX) && key.endsWith(KEY_SUFFIX)) all.add(key.slice(KEY_PREFIX.length, -KEY_SUFFIX.length));
        }
        for (const name of all) {
            const state = wantedState(name);
            if (state !== "keep") localStorage.setItem(KEY_PREFIX + name + KEY_SUFFIX, String(state === "collapse"));
        }
    } catch {
        // Storage blocked: the clicks below still set each section.
    }
}

let active = false;
let observer: MutationObserver | null = null;
let frame = 0;
const handled = new Set<string>();
let sidebarHandled = false;

/** Opens or closes each section not yet set on this page load; returns how many headers were clicked. */
export function applySections(root: ParentNode = document): number {
    let clicked = 0;
    for (const section of root.querySelectorAll<HTMLElement>(".sidebar-section[data-section-name]")) {
        const name = section.dataset.sectionName!;
        const header = section.querySelector<HTMLButtonElement>(".sidebar-section-header-wrapper .sidebar-section-header-collapsable");
        if (!header || handled.has(name)) continue;
        handled.add(name);
        const state = wantedState(name);
        if (state === "keep") continue;
        const expanded = header.getAttribute("aria-expanded") === "true";
        if (expanded !== (state === "expand")) {
            header.click();
            clicked++;
        }
    }
    return clicked;
}

function collapseSidebarOnce() {
    if (sidebarHandled || !settings.store.startCollapsed) return;
    const body = document.body;
    if (!body || body.classList.contains("mobile-view")) {
        if (body) sidebarHandled = true;
        return;
    }
    const toggle = document.querySelector<HTMLButtonElement>(".header-sidebar-toggle button");
    if (!toggle) return;
    sidebarHandled = true;
    if (toggle.getAttribute("aria-expanded") === "true") toggle.click();
}

function pass() {
    applySections();
    collapseSidebarOnce();
}

function watch(on: boolean) {
    if (on && !observer) {
        observer = new MutationObserver(() => {
            if (frame) return;
            frame = requestAnimationFrame(() => {
                frame = 0;
                pass();
            });
        });
        onReady(() => {
            if (!observer) return;
            observer.observe(document.body, { childList: true, subtree: true });
            pass();
        });
    } else if (!on && observer) {
        observer.disconnect();
        observer = null;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
    }
}

function applyStyle() {
    if (active && settings.store.headerHover) registerStyle(STYLE, HOVER_CSS);
    else unregisterStyle(STYLE);
}

/** For tests: forget which sections were set on this page load. */
export function resetHandled() {
    handled.clear();
    sidebarHandled = false;
}

export default definePlugin({
    name: "SidebarSections",
    displayName: "侧栏分区默认状态",
    description: "设置侧栏「类别」「标签」「私信」和自定义分区打开页面时默认展开还是折叠，分区标题旁的编辑按钮只在悬停时显示，可选打开页面时收起整个侧栏（对照 Void++ BetterSidebar）。",
    tags: ["reading"],
    icon: SidebarIcon,
    enabledByDefault: false,
    startAt: StartAt.Init,
    settings,
    start() {
        active = true;
        presetStorage();
        applyStyle();
        watch(true);
    },
    stop() {
        active = false;
        applyStyle();
        watch(false);
    },
    onSettingsChange() {
        applyStyle();
        if (!active) return;
        // A changed choice shows at once: the sections are set again, the whole sidebar is not.
        presetStorage();
        handled.clear();
        pass();
    },
});
