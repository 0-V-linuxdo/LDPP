/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s MessageTimestamps for posts: Discourse dates each floor relatively (「3 小时」「10月 2」) and keeps the exact
// time in a tooltip. This writes the exact time beside it, in the format of 「话题列表显示创建时间」: 19:46 today,
// 10/02 19:46 this year, 2025/10/02 19:46 before. The time is read from the date's data-time; Discourse's own node is
// left alone (its text is refreshed every minute), and in 「替换」 mode it is hidden by CSS while ours is there.

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { CalendarClockIcon } from "@components/icons";
import { formatCreated } from "@plugins/createdTime";
import { h, mark } from "@utils/dom";
import definePlugin, { OptionType } from "@utils/types";

const TIME = "ldpp-post-time";
const DATE = ".topic-post .post-info.post-date .relative-date[data-time], .topic-post a.post-date .relative-date[data-time]";
const REPLACE = "ldpp-post-time-replace";

export const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "显示方式",
        options: [
            { label: "追加在相对时间后（3 小时 · 19:46）", value: "append", default: true },
            { label: "替换相对时间", value: "replace" },
        ],
    },
});

const pad = (value: number) => String(value).padStart(2, "0");

function fullTime(time: number): string {
    const date = new Date(time);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Adds or refreshes the exact time after each post's relative date. */
export function stampPosts(root: ParentNode = document, now = Date.now()) {
    for (const date of root.querySelectorAll<HTMLElement>(DATE)) {
        const time = Number(date.dataset.time);
        if (!Number.isFinite(time) || time <= 0) continue;
        const text = formatCreated(time, now);
        let span = date.nextElementSibling instanceof HTMLElement && date.nextElementSibling.classList.contains(TIME) ? date.nextElementSibling : null;
        if (span?.textContent === text) continue;
        span ??= mark(h("span", { class: TIME }), "post-time");
        span.textContent = text;
        span.title = fullTime(time);
        if (span.previousElementSibling !== date) date.after(span);
    }
}

function applyMode() {
    document.documentElement.classList.toggle(REPLACE, active && settings.store.mode === "replace");
}

let active = false;
let observer: MutationObserver | null = null;
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let clock: ReturnType<typeof setInterval> | undefined;

export default definePlugin({
    name: "PostTimestamps",
    displayName: "楼层完整时间",
    description: "在每层楼的相对时间（「3 小时」）旁直接显示发帖时间，今天的只显示时分，也可替换相对时间（对照 Void++ MessageTimestamps）。",
    tags: ["reading"],
    icon: CalendarClockIcon,
    enabledByDefault: true,
    settings,
    start() {
        active = true;
        applyMode();
        observer = new MutationObserver(() => { flushTimer ??= setTimeout(() => { flushTimer = undefined; stampPosts(); }, 100); });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        stampPosts();
        // "Today" turns into a date at midnight.
        clock = setInterval(() => { if (document.visibilityState === "visible") stampPosts(); }, 60_000);
    },
    stop() {
        active = false;
        applyMode();
        observer?.disconnect();
        observer = null;
        clearTimeout(flushTimer);
        flushTimer = undefined;
        clearInterval(clock);
        clock = undefined;
        for (const span of document.querySelectorAll(`.${TIME}`)) span.remove();
    },
    onSettingsChange: applyMode,
});
