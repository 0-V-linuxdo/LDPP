/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s RecentTopics for linux.do: Ctrl + ` shows the topics opened lately as cards (title, the floor read up to,
// when, and the start of its AI summary when there is one), like Alt+Tab. Keep Ctrl held and press ` again to move on
// (Shift goes back); letting go of Ctrl opens the chosen topic at the floor last read. ← / → / ↑ / ↓ and Enter work too,
// Esc closes. The list is kept in the script's storage, so every tab shares it.

import "./styles.css";

import { cachedTopicTitle, resolveTopicTitle } from "@api/Discourse";
import { Summaries } from "@api/DataStore";
import { currentRoute, routeTo } from "@api/Navigation";
import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/controls";
import { LayoutGridIcon } from "@components/icons";
import { h, mark } from "@utils/dom";
import { gmGet, gmSet } from "@utils/gm";
import definePlugin, { OptionType } from "@utils/types";

import { floorOf, initialIndex, normalizeRecent, patchRecent, type RecentTopic, summaryExcerpt, timeAgo, touchRecent, wrapIndex } from "./model";

const KEY = "LDPP.recentTopics";

export const settings = definePluginSettings({
    maxItems: {
        type: OptionType.SLIDER,
        description: "切换器里最多显示几个话题。",
        min: 4,
        max: 30,
        step: 1,
        default: 12,
    },
    showSummary: {
        type: OptionType.BOOLEAN,
        description: "卡片上显示 AI 总结的开头（如果有）。",
        default: true,
    },
    releaseToOpen: {
        type: OptionType.BOOLEAN,
        description: "松开 Ctrl 立即打开选中的话题（关闭后需按 Enter 或点击）。",
        default: true,
    },
    clear: {
        type: OptionType.COMPONENT,
        description: "清空最近话题",
        render: () => Button("清空最近话题", { small: true, onClick: () => { save([]); showToast("最近话题已清空", "success"); } }),
    },
});

const load = () => normalizeRecent(gmGet<unknown>(KEY, []));
const save = (list: RecentTopic[]) => gmSet(KEY, list);

function pageTitle(): string {
    return document.querySelector("#topic-title .fancy-title, .title-wrapper .fancy-title")?.textContent?.trim() ?? "";
}

let titleTimer: ReturnType<typeof setTimeout> | undefined;

function recordVisit() {
    const route = currentRoute();
    if (route.kind !== "topic" || !route.topicId) return;
    const id = route.topicId;
    save(touchRecent(load(), { id, title: cachedTopicTitle(id), floor: floorOf(location.pathname) }));
    // Discourse fills the title in once the topic has loaded.
    clearTimeout(titleTimer);
    titleTimer = setTimeout(() => {
        const title = pageTitle() || cachedTopicTitle(id);
        if (title && currentRoute().topicId === id) save(patchRecent(load(), id, { title }));
    }, 1500);
}

let floorTimer: ReturnType<typeof setTimeout> | undefined;

/** Discourse rewrites the URL to the floor on screen as you scroll; remember it, at most once a second. */
function onScroll() {
    floorTimer ??= setTimeout(() => {
        floorTimer = undefined;
        const route = currentRoute();
        const floor = floorOf(location.pathname);
        if (route.topicId && floor) save(patchRecent(load(), route.topicId, { floor }));
    }, 1000);
}

/* Switcher */

let overlay: HTMLElement | null = null;
let items: RecentTopic[] = [];
let selected = 0;
let holding = false;

function card(item: RecentTopic, index: number, currentId: string | null): HTMLElement {
    const title = h("div", { class: "ldpp-recent-title" }, item.title || `话题 #${item.id}`);
    if (!item.title) {
        void resolveTopicTitle(item.id).then(text => {
            if (!text) return;
            title.textContent = text;
            save(patchRecent(load(), item.id, { title: text }));
        });
    }
    const summary = settings.store.showSummary ? Summaries.get(item.id)?.[0]?.summary : undefined;
    const meta = [item.id === currentId ? "当前" : timeAgo(item.visitedAt), item.floor > 1 ? `读到 #${item.floor}` : ""].filter(Boolean).join(" · ");
    return h("button", {
        type: "button",
        class: "ldpp-recent-card",
        dataset: { index: String(index) },
        attrs: { role: "option", "aria-selected": String(index === selected) },
        on: {
            click: () => openAt(index),
            mousemove: () => { if (selected !== index) select(index); },
        },
    },
        title,
        h("div", { class: "ldpp-recent-meta" }, meta),
        summary ? h("div", { class: "ldpp-recent-summary" }, summaryExcerpt(summary)) : null,
    );
}

function select(index: number) {
    selected = wrapIndex(index, items.length);
    for (const el of overlay?.querySelectorAll<HTMLElement>(".ldpp-recent-card") ?? []) {
        const on = Number(el.dataset.index) === selected;
        el.classList.toggle("is-selected", on);
        el.setAttribute("aria-selected", String(on));
        if (on) el.scrollIntoView({ block: "nearest" });
    }
}

function openSwitcher() {
    items = load().slice(0, settings.store.maxItems);
    if (!items.length) {
        showToast("还没有最近打开的话题。", "info", { key: "recent-topics" });
        return;
    }
    const currentId = currentRoute().topicId;
    selected = initialIndex(items, currentId);
    const grid = h("div", { class: "ldpp-recent-grid", attrs: { role: "listbox", "aria-label": "最近话题" } }, ...items.map((item, index) => card(item, index, currentId)));
    overlay = mark(h("div", {
        class: "ldpp-recent-overlay",
        on: { click: (event: MouseEvent) => { if (event.target === overlay) closeSwitcher(); } },
    }, h("div", { class: "ldpp-recent-panel" },
        h("div", { class: "ldpp-recent-head" }, "最近话题", h("span", { class: "ldpp-recent-hint" }, "按住 Ctrl 再按 ` 切换 · Enter 打开 · Esc 关闭")),
        grid,
    )), "recent-topics");
    document.body.append(overlay);
    select(selected);
}

function closeSwitcher() {
    overlay?.remove();
    overlay = null;
    holding = false;
}

function openAt(index: number) {
    const item = items[index];
    closeSwitcher();
    if (!item || item.id === currentRoute().topicId) return;
    routeTo(`/t/topic/${item.id}${item.floor > 1 ? `/${item.floor}` : ""}`);
}

/** Cards per row, to move up and down a row. */
function columns(): number {
    const cards = overlay?.querySelectorAll<HTMLElement>(".ldpp-recent-card");
    if (!cards?.length) return 1;
    const top = cards[0].offsetTop;
    let count = 0;
    for (const el of cards) {
        if (el.offsetTop !== top) break;
        count++;
    }
    return Math.max(1, count);
}

function onKeyDown(event: KeyboardEvent) {
    if (event.isComposing) return;
    if (event.code === "Backquote" && event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        if (!overlay) {
            openSwitcher();
            holding = true;
        } else {
            select(selected + (event.shiftKey ? -1 : 1));
        }
        return;
    }
    if (!overlay) return;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columns(), ArrowUp: -columns(), Tab: event.shiftKey ? -1 : 1 };
    if (event.key in moves) {
        event.preventDefault();
        event.stopPropagation();
        select(selected + moves[event.key]);
    } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        openAt(selected);
    } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeSwitcher();
    }
}

function onKeyUp(event: KeyboardEvent) {
    if (!overlay || !holding || event.key !== "Control") return;
    holding = false;
    if (settings.store.releaseToOpen) openAt(selected);
}

/* The window lost focus while Ctrl was held (another app took it): keep the panel, but stop waiting for the release. */
function onBlur() {
    holding = false;
}

let listeners: AbortController | null = null;

export default definePlugin({
    name: "RecentTopics",
    displayName: "最近话题切换器",
    description: "按 Ctrl + ` 弹出最近打开的话题卡片（标题、读到第几楼、总结开头），按住 Ctrl 连按 ` 切换，松开即打开（对照 Void++ RecentTopics）。",
    tags: ["reading"],
    icon: LayoutGridIcon,
    enabledByDefault: true,
    settings,
    start() {
        listeners = new AbortController();
        const { signal } = listeners;
        // Capture: Discourse's own shortcuts (and the composer) must not see the keys while the panel is open.
        window.addEventListener("keydown", onKeyDown, { capture: true, signal });
        window.addEventListener("keyup", onKeyUp, { capture: true, signal });
        window.addEventListener("blur", onBlur, { signal });
        window.addEventListener("scroll", onScroll, { passive: true, signal });
        recordVisit();
    },
    stop() {
        listeners?.abort();
        listeners = null;
        clearTimeout(titleTimer);
        clearTimeout(floorTimer);
        floorTimer = undefined;
        closeSwitcher();
    },
    events: {
        navigate() {
            closeSwitcher();
            recordVisit();
        },
    },
});
