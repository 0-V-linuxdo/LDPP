/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { dispatch } from "@api/Events";
import { currentRoute } from "@api/Navigation";
import { isPluginEnabled } from "@api/PluginManager";
import { IconButton } from "@components/controls";
import { SettingsIcon } from "@components/icons";
import { classes } from "@utils/css";
import { h, mark } from "@utils/dom";

import { DEFAULT_WIDTH as NATIVE_DEFAULT_WIDTH } from "../sidebarWidth";
import { createQAPanel, type QAPanel } from "../topicQA";
import { createSummaryView, type SummaryView } from "./view";

export interface SidebarOptions {
    position: "left" | "right";
    autoOpen: boolean;
}

type Tab = "summary" | "question";

let root: HTMLElement | null = null;
let topicId: string | null = null;
let open = false;
let tab: Tab = "summary";
let content: SummaryView | QAPanel | null = null;
let options: SidebarOptions = { position: "right", autoOpen: false };
let layoutWatch: { observer: MutationObserver; sizes: ResizeObserver; watched: Element | null; onResize: () => void } | null = null;


/** Discourse's sidebar box: where it starts and how wide it is. */
export interface SidebarBox {
    left: number;
    width: number;
}

/*
 * The panel lines up with Discourse's own sidebar at the width it is set to (dragged with 「侧边栏宽度」): on the left
 * it spans from the screen edge to that sidebar's right edge, so it covers exactly the sidebar column and none of the
 * topic; on the right it is as wide as that sidebar.
 */
export function panelWidth(position: SidebarOptions["position"], sidebar: SidebarBox): number {
    return Math.max(0, Math.round(position === "left" ? sidebar.left + sidebar.width : sidebar.width));
}

function nativeSidebar(): HTMLElement | null {
    if (!document.body?.classList.contains("has-sidebar-page") || document.body.classList.contains("mobile-view")) return null;
    const el = document.querySelector<HTMLElement>("#main-outlet-wrapper > .sidebar-wrapper");
    return el && el.offsetWidth > 0 ? el : null;
}

/** A --d-sidebar-width value in px: linux.do's own is 15em, 「侧边栏宽度」 sets px. */
export function cssLength(value: string, fontSize: number, rootFontSize: number): number | null {
    const match = value.trim().match(/^(-?[\d.]+)(px|em|rem)?$/);
    if (!match) return null;
    const amount = Number.parseFloat(match[1]);
    return match[2] === "em" ? amount * fontSize : match[2] === "rem" ? amount * rootFontSize : amount;
}

/** The sidebar as shown, or, while it is collapsed, where and how wide it would be. */
export function nativeSidebarBox(): SidebarBox {
    const el = nativeSidebar();
    if (el) {
        const rect = el.getBoundingClientRect();
        return { left: rect.left, width: rect.width };
    }
    const wrapper = document.querySelector("#main-outlet-wrapper");
    if (!wrapper) return { left: 0, width: NATIVE_DEFAULT_WIDTH };
    const style = getComputedStyle(wrapper);
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const width = cssLength(style.getPropertyValue("--d-sidebar-width"), Number.parseFloat(style.fontSize) || rootFontSize, rootFontSize);
    return { left: wrapper.getBoundingClientRect().left + (Number.parseFloat(style.paddingLeft) || 0), width: width ?? NATIVE_DEFAULT_WIDTH };
}

function applyLayout() {
    if (!root) return;
    root.className = classes("ldpp-sidebar", `is-${options.position}`, open && "is-open");
    root.style.setProperty("--ldpp-sidebar-width", `${panelWidth(options.position, nativeSidebarBox())}px`);
    const handle = root.querySelector(".ldpp-sidebar-handle");
    handle?.setAttribute("aria-expanded", String(open));
    // Follow the sidebar element Discourse currently renders (it is replaced on some route changes).
    if (layoutWatch) {
        const target = document.querySelector("#main-outlet-wrapper > .sidebar-wrapper");
        if (target !== layoutWatch.watched) {
            layoutWatch.sizes.disconnect();
            if (target) layoutWatch.sizes.observe(target);
            layoutWatch.watched = target;
        }
    }
}

function watchLayout() {
    if (layoutWatch) return;
    let frame = 0;
    const onResize = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(applyLayout);
    };
    // Collapsing the sidebar flips body classes; dragging its edge resizes it.
    const observer = new MutationObserver(onResize);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", onResize);
    layoutWatch = { observer, sizes: new ResizeObserver(onResize), watched: null, onResize };
}

function unwatchLayout() {
    if (!layoutWatch) return;
    layoutWatch.observer.disconnect();
    layoutWatch.sizes.disconnect();
    window.removeEventListener("resize", layoutWatch.onResize);
    layoutWatch = null;
}

function renderBody() {
    if (!root || !topicId) return;
    content?.destroy();
    const qaEnabled = isPluginEnabled("TopicQA");
    if (!qaEnabled) tab = "summary";
    const id = topicId;
    content = tab === "question" ? createQAPanel(id) : createSummaryView(id, { variant: "sidebar", onAsk: qaEnabled ? () => select("question") : undefined });
    const tabButton = (which: Tab, label: string) => h("button", { type: "button", class: classes("ldpp-sidebar-tab", tab === which && "is-active"), attrs: { role: "tab", "aria-selected": String(tab === which) }, on: { click: () => select(which) } }, label);
    root.querySelector(".ldpp-sidebar-tabs")?.replaceChildren(tabButton("summary", "总结"), ...(qaEnabled ? [tabButton("question", "提问")] : []));
    // No topic title here: the page already shows it right beside the panel.
    root.querySelector(".ldpp-sidebar-body")?.replaceChildren(content.el);
    const gear = root.querySelector<HTMLElement>(".ldpp-sidebar-settings");
    if (gear) {
        gear.title = tab === "question" ? "提问设置" : "总结设置";
        gear.setAttribute("aria-label", gear.title);
    }
    if (tab === "question") (content as QAPanel).focus();
}

function select(next: Tab) {
    tab = next;
    renderBody();
}

export function setSidebarOpen(next: boolean) {
    open = next;
    applyLayout();
}

export function toggleSidebar() {
    if (root) setSidebarOpen(!open);
}

function build(): HTMLElement {
    const panel = h("section", { class: "ldpp-sidebar-panel", attrs: { "aria-label": "LD++ 话题助手" } },
        // The 总结 / 提问 tabs are the header: no title row of its own, and they stay in reach while the body scrolls.
        h("header", { class: "ldpp-sidebar-header" },
            h("div", { class: "ldpp-sidebar-tabs", attrs: { role: "tablist" } }),
            // The settings of the tab in view: 总结 → 话题 AI 总结, 提问 → 提问 / 追问.
            IconButton(SettingsIcon(16), { title: "总结设置", className: "ldpp-sidebar-settings", onClick: () => dispatch("openSettings", { tab: "features", plugin: tab === "question" ? "TopicQA" : "TopicSummary" }) }),
        ),
        h("div", { class: "ldpp-sidebar-body" }),
    );
    // The original script's handle: a 20 × 60 bar on the panel's outer edge, which stays on screen when it slides out.
    const handle = h("button", {
        type: "button",
        class: "ldpp-sidebar-handle",
        title: "展开/收起 侧边栏（Alt+S）",
        attrs: { "aria-label": "展开/收起 话题助手", "aria-expanded": "false" },
        on: { click: toggleSidebar },
    });
    return mark(h("aside", { class: "ldpp-sidebar" }, panel, handle), "sidebar");
}

export function syncSidebar(next: SidebarOptions, focus?: Tab) {
    options = next;
    const route = currentRoute();
    if (route.kind !== "topic" || !route.topicId) {
        unmountSidebar();
        return;
    }
    const changed = route.topicId !== topicId;
    if (!root) {
        root = build();
        document.body.appendChild(root);
        open = options.autoOpen;
        watchLayout();
    }
    if (focus) {
        tab = focus;
        open = true;
    }
    if (changed || focus) {
        topicId = route.topicId;
        if (changed && !focus) tab = "summary";
        renderBody();
    }
    setSidebarOpen(open);
}

export function sidebarTopic(): string | null {
    return root ? topicId : null;
}

export function unmountSidebar() {
    unwatchLayout();
    content?.destroy();
    content = null;
    root?.remove();
    root = null;
    topicId = null;
}
