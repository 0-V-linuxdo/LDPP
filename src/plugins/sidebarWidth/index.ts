/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Resizable Discourse sidebar, from the user's 「[Discourse] Sidebar ↔️ Enhancer」 userscript.
//
// Discourse lays out #main-outlet-wrapper as a grid, [sidebar | main], whose first column is var(--d-sidebar-width)
// (linux.do sets 15em on div#main-outlet-wrapper); collapsing the sidebar removes body.has-sidebar-page and Discourse
// drops that column itself. So only that variable is overridden. The old script switched the wrapper to flex and
// wrapped .sidebar-wrapper in its own 250px div.sidebar-container whenever Discourse's (same-named) one was gone -
// which is what collapsing does - leaving an empty column behind. Nothing of Discourse's is moved here.
//
// The drag handle is a fixed element in the gap to the right of the sidebar: .sidebar-wrapper is sticky and
// scrolls, so a child inside it would be clipped and would cover the sidebar's own scrollbar.

import "./styles.css";

import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { PanelLeftIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import { h, mark, onReady } from "@utils/dom";
import definePlugin, { OptionType } from "@utils/types";

export const DEFAULT_WIDTH = 250;
export const MIN_WIDTH = 100;
const MAX_SETTING = 600;
/** Room always left for the topic list. */
export const MIN_MAIN = 200;
/** The old userscript's localStorage key; its saved width is adopted once. */
export const LEGACY_KEY = "discourseSidebarWidth";
const LAYOUT_STYLE = "sidebarWidth-layout";

export const settings = definePluginSettings({
    width: {
        type: OptionType.SLIDER,
        description: "侧边栏宽度（也可以拖动侧边栏右侧边缘调整，双击边缘恢复默认）。",
        min: MIN_WIDTH,
        max: MAX_SETTING,
        step: 1,
        unit: "px",
        default: DEFAULT_WIDTH,
    },
    topThird: {
        type: OptionType.BOOLEAN,
        description: "只在侧边栏顶部 1/3 高度内可拖动（关闭后整条右边缘都可拖动）",
        default: true,
    },
    legacyImported: {
        type: OptionType.CUSTOM,
        default: false,
    },
});

/** A width the old script stored ("250px"), or null when there is none or it is unusable. */
export function parseLegacyWidth(raw: string | null): number | null {
    const value = Number.parseInt(raw ?? "", 10);
    return Number.isFinite(value) && value >= MIN_WIDTH ? Math.min(value, MAX_SETTING) : null;
}

/** Keeps a dragged width between the minimum and what still leaves MIN_MAIN for the topic list. */
export function clampWidth(width: number, room: number): number {
    return Math.round(Math.max(MIN_WIDTH, Math.min(width, Math.max(MIN_WIDTH, room - MIN_MAIN))));
}

const currentWidth = () => Number(settings.store.width) || DEFAULT_WIDTH;

function applyWidth(width = currentWidth()) {
    registerStyle(LAYOUT_STYLE, `body:not(.mobile-view) #main-outlet-wrapper { --d-sidebar-width: ${Math.round(width)}px !important; }`);
}

/** The visible desktop sidebar, or null when it is collapsed, absent on this page, or on mobile. */
function sidebar(): HTMLElement | null {
    const body = document.body;
    if (!body || body.classList.contains("mobile-view") || !body.classList.contains("has-sidebar-page")) return null;
    const el = document.querySelector<HTMLElement>("#main-outlet-wrapper > .sidebar-wrapper");
    return el && el.offsetWidth > 0 ? el : null;
}

/** Width available to sidebar + topic list: the wrapper minus its padding and the column gap. */
function roomOf(wrapper: HTMLElement): number {
    const box = getComputedStyle(wrapper);
    return wrapper.clientWidth - parseFloat(box.paddingLeft) - parseFloat(box.paddingRight) - (parseFloat(box.columnGap) || 0);
}

let handle: HTMLElement | null = null;
let bodyWatcher: MutationObserver | null = null;
let sizeWatcher: ResizeObserver | null = null;
let watched: Element | null = null;
let frame = 0;
let warnedLegacy = false;

function place() {
    frame = 0;
    if (!handle) return;
    if (!handle.isConnected) document.body.append(handle);
    // Expanding the sidebar is animated; following its size puts the handle at the final edge.
    const target = document.querySelector("#main-outlet-wrapper > .sidebar-wrapper");
    if (target !== watched) {
        sizeWatcher?.disconnect();
        if (target) sizeWatcher?.observe(target);
        watched = target;
    }
    if (!warnedLegacy && document.getElementById("discourse-resizer")) {
        warnedLegacy = true;
        showToast("「Sidebar ↔️ Enhancer」脚本仍在运行，它会在折叠侧边栏时打乱布局；LD++ 已内置这个功能，请在脚本管理器中停用旧脚本。", "warning", { key: "sidebar-width-legacy" });
    }
    const el = sidebar();
    if (!el) {
        handle.hidden = true;
        return;
    }
    const rect = el.getBoundingClientRect();
    handle.hidden = false;
    handle.style.left = `${rect.right}px`;
    handle.style.top = `${rect.top}px`;
    handle.style.height = `${handleHeight(rect.height, settings.store.topThird !== false)}px`;
}

/** The full edge would catch the pointer all the way down the page beside the topic list; by default only its top third does. */
export function handleHeight(sidebarHeight: number, topThird: boolean): number {
    return Math.round(topThird ? sidebarHeight / 3 : sidebarHeight);
}

function schedule() {
    if (!frame) frame = requestAnimationFrame(place);
}

function onPointerDown(event: PointerEvent) {
    const el = sidebar();
    if (!handle || !el || event.button !== 0) return;
    event.preventDefault();
    const rect = el.getBoundingClientRect();
    const grab = event.clientX - rect.right; // the edge stays where it was grabbed instead of jumping to the pointer
    const room = roomOf(el.parentElement as HTMLElement);
    const target = handle;
    let width = Math.round(rect.width);
    // Capture keeps the col-resize cursor while the pointer leaves the 10px handle; the listeners sit on window so a
    // drag still works if capture is refused.
    try { target.setPointerCapture(event.pointerId); } catch { /* not an active pointer */ }
    target.classList.add("is-active");
    document.documentElement.classList.add("ldpp-sidebar-width-resizing");
    const move = (e: PointerEvent) => {
        width = clampWidth(e.clientX - grab - rect.left, room);
        applyWidth(width);
        schedule();
    };
    const end = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        target.classList.remove("is-active");
        document.documentElement.classList.remove("ldpp-sidebar-width-resizing");
        settings.store.width = width;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
}

function onDoubleClick() {
    settings.reset("width");
    applyWidth();
    schedule();
}

function mount() {
    if (handle) return;
    handle = mark(h("div", { class: "ldpp-sidebar-width-handle", title: "拖动调整侧边栏宽度，双击恢复默认", hidden: true }), "sidebar-handle");
    handle.addEventListener("pointerdown", onPointerDown);
    handle.addEventListener("dblclick", onDoubleClick);
    document.body.append(handle);
    sizeWatcher = new ResizeObserver(schedule);
    // Collapsing/expanding the sidebar and route changes flip body classes; Ember re-renders the sidebar.
    bodyWatcher = new MutationObserver(schedule);
    bodyWatcher.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();
}

export default definePlugin({
    name: "SidebarWidth",
    displayName: "侧边栏宽度",
    description: "拖动左侧边栏的右边缘调整宽度，宽度会记住；折叠侧边栏时正文正常铺满。双击边缘恢复默认宽度。",
    tags: ["reading"],
    icon: PanelLeftIcon,
    enabledByDefault: true,
    settings,
    start() {
        // Adopt the width saved by the old userscript once, so switching to LD++ keeps the user's sidebar.
        if (!settings.store.legacyImported) {
            const legacy = parseLegacyWidth(localStorage.getItem(LEGACY_KEY));
            if (legacy != null) settings.store.width = legacy;
            settings.store.legacyImported = true;
        }
        applyWidth();
        onReady(mount);
    },
    stop() {
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        bodyWatcher?.disconnect();
        sizeWatcher?.disconnect();
        bodyWatcher = sizeWatcher = null;
        watched = null;
        window.removeEventListener("resize", schedule);
        window.removeEventListener("scroll", schedule);
        handle?.remove();
        handle = null;
        unregisterStyle(LAYOUT_STYLE);
    },
    onSettingsChange() {
        applyWidth();
        schedule();
    },
});
