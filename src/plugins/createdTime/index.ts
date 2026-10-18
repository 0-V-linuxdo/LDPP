/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「话题列表显示创建时间」 from the unmaintained linuxdo-scripts (anghunk; MenuShowcreatetime / MenuShowcreatetime1): each
// topic's creation time, read from the activity cell's tooltip (「创建日期：2026 年 10月 2 日 19:46」 / "Created: Oct 2,
// 2026 7:46 pm"), shown in place of the view count (the original's default) or after the last-activity time, in the
// original's colours by age and with its tombstone for topics older than three months.
//
// The original rewrote the cells every second. Here it is a topic-list processor (it runs whenever rows change) plus a
// minute timer for the colours and the "today" format, and Discourse's own nodes are never replaced: the time is an
// extra <span> in the cell, and the view count is hidden by CSS while it is there, so Ember can keep updating it.
//
// In place of the view count the column header follows: it reads 「创建时间」 and sorts by creation time (Discourse's own
// order=created, newest first, then oldest first on a second click) instead of by views, with the same chevron as
// Discourse's sorted headers.

import "./styles.css";

import { routeTo } from "@api/Navigation";
import { definePluginSettings } from "@api/Settings";
import { getRows, registerProcessor, type TopicRow, unregisterProcessor } from "@api/TopicList";
import { ClockIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import { h, mark, svg } from "@utils/dom";
import definePlugin, { OptionType } from "@utils/types";

const TIME = "ldpp-created-time";
const ACTIVITY_CELL = "td.activity[title], td.age[title]";
const DAY = 24 * 60 * 60 * 1000;
const HEADER_STYLE = "createdTime-header";
const VIEWS_HEADER = ".topic-list th.views";
const SORTED = "ldpp-created-sorted";
const ASCENDING = "ldpp-created-ascending";

/*
 * The views header relabelled: Discourse's 「浏览量」 text and its sort chevron are sized to nothing, the label and our
 * chevron (drawn like Discourse's, in rem since the button's own font size is 0) take their place.
 */
export const HEADER_CSS = `${VIEWS_HEADER} > button {
    font-size: 0 !important;
}
${VIEWS_HEADER} > button::before {
    content: "创建时间";
    font-size: var(--font-down-1-rem, 0.8706rem);
}
html.${SORTED} ${VIEWS_HEADER} > button::after {
    content: "";
    display: inline-block;
    width: 0.32rem;
    height: 0.32rem;
    margin-inline-start: 0.4rem;
    border-right: 0.12rem solid currentColor;
    border-bottom: 0.12rem solid currentColor;
    vertical-align: 0.22rem;
    transform: rotate(45deg);
}
html.${SORTED}.${ASCENDING} ${VIEWS_HEADER} > button::after {
    vertical-align: 0.05rem;
    transform: rotate(-135deg);
}`;

export const settings = definePluginSettings({
    position: {
        type: OptionType.SELECT,
        description: "显示位置",
        options: [
            { label: "替换浏览量", value: "views", default: true },
            { label: "追加在活动时间后", value: "activity" },
        ],
    },
});

type Position = "views" | "activity";
const position = (): Position => (settings.store.position === "activity" ? "activity" : "views");

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

/** The creation time in the activity cell's tooltip: its first line, after the label (any language) and colon. */
export function parseCreated(title: string): number | null {
    const line = title.split("\n")[0] ?? "";
    const text = line.replace(/^[^:：]*[:：]\s*/, "").trim();
    const zh = text.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2}):(\d{2})/);
    if (zh) return new Date(+zh[1], +zh[2] - 1, +zh[3], +zh[4], +zh[5]).getTime();
    const en = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*([ap]m)?/i);
    if (en) {
        let hours = +en[4] % 12;
        if (en[6]?.toLowerCase() === "pm") hours += 12;
        else if (!en[6]) hours = +en[4];
        return new Date(+en[3], MONTHS[en[1].toLowerCase()], +en[2], hours, +en[5]).getTime();
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) ? parsed : null;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** The original's format: 19:46 today, 10/02 19:46 this year, 2025/10/02 19:46 before. */
export function formatCreated(time: number, now = Date.now()): string {
    const date = new Date(time);
    const today = new Date(now);
    const clock = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    if (date.toDateString() === today.toDateString()) return clock;
    const day = `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
    return date.getFullYear() === today.getFullYear() ? `${day} ${clock}` : `${date.getFullYear()}/${day} ${clock}`;
}

export type Age = "day" | "week" | "month" | "quarter" | "old";

/** The original's colour bands: under a day, a week, 30 days, 90 days, then older. */
export function ageOf(time: number, now = Date.now()): Age {
    const age = now - time;
    if (age < DAY) return "day";
    if (age < 7 * DAY) return "week";
    if (age < 30 * DAY) return "month";
    if (age < 90 * DAY) return "quarter";
    return "old";
}

/** The original's tombstone for topics older than three months. */
const tombstone = () => {
    const icon = svg("0 0 1024 1024", [["path", { fill: "#A51C30", d: "M916.992 813.44c11.008-44.032-9.856-53.632-9.856-53.632 7.168-23.552-12.8-46.592-12.8-46.592a72.448 72.448 0 0 0-12.032-34.816h-85.12V179.2a9.856 9.856 0 0 0-9.984-9.6h-54.144a9.856 9.856 0 0 1-9.472-7.168A204.8 204.8 0 0 0 524.8 14.208h-27.904a204.8 204.8 0 0 0-198.016 147.712 9.856 9.856 0 0 1-9.472 7.168h-51.968a10.496 10.496 0 0 0-10.752 10.368v499.2h-84.992v1.28a78.336 78.336 0 0 0-9.088 32.256s-22.656 23.296-15.36 46.72c0 0-20.736 9.856-9.344 53.504 0 0-66.176 11.776-49.408 193.536h83.072v0.768h740.608l86.528-0.896c14.72-181.376-51.712-192.384-51.712-192.384z" }]], 22);
    icon.classList.add("ldpp-created-tomb");
    return icon;
};

function fullDate(time: number): string {
    const date = new Date(time);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function show(row: TopicRow, where: Position, now: number) {
    const activity = row.el.querySelector<HTMLElement>(ACTIVITY_CELL);
    const views = row.el.querySelector<HTMLElement>("td.views");
    const time = activity ? parseCreated(activity.getAttribute("title") ?? "") : null;
    // Lists without a views column (some layouts, phones) fall back to the activity cell.
    const host = (where === "views" ? views : null) ?? activity;
    for (const old of row.el.querySelectorAll<HTMLElement>(`.${TIME}`)) if (old.parentElement !== host || time === null) old.remove();
    if (!host || time === null) return;
    const inViews = host === views;
    const age = ageOf(time, now);
    const text = inViews ? formatCreated(time, now) : `（${formatCreated(time, now)}）`;
    const count = inViews ? views?.querySelector(".number")?.getAttribute("title") : null;
    const tip = count ? `创建于 ${fullDate(time)}\n${count}` : `创建于 ${fullDate(time)}`;
    const key = `${text}|${age}|${tip}`;
    let span = host.querySelector<HTMLElement>(`:scope > .${TIME}`);
    if (span?.dataset.key === key) return;
    span ??= mark(h("span", { class: TIME }), "created-time");
    span.className = `${TIME} is-${age}`;
    span.dataset.key = key;
    span.title = tip;
    span.replaceChildren(...(age === "old" ? [tombstone(), text] : [text]));
    if (span.parentElement !== host) host.append(span);
}

/** The list sorted by creation time: newest first, or oldest first when it already was newest first. */
export function createdSortUrl(href: string): string {
    const url = new URL(href);
    const ascending = url.searchParams.get("order") === "created" && url.searchParams.get("ascending") !== "true";
    url.searchParams.set("ascending", String(ascending));
    url.searchParams.set("order", "created");
    return url.pathname + url.search + url.hash;
}

/** Marks <html> with the current created-time sort, for the header's chevron. */
function syncSortState() {
    const params = new URLSearchParams(location.search);
    const sorted = active && position() === "views" && params.get("order") === "created";
    document.documentElement.classList.toggle(SORTED, sorted);
    document.documentElement.classList.toggle(ASCENDING, sorted && params.get("ascending") === "true");
}

function onHeaderClick(event: MouseEvent) {
    if (position() !== "views" || !(event.target instanceof Element) || !event.target.closest(VIEWS_HEADER)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    routeTo(createdSortUrl(location.href));
}

function labelHeaders() {
    for (const button of document.querySelectorAll<HTMLElement>(`${VIEWS_HEADER} > button`)) {
        if (position() === "views") {
            button.title = "按创建时间排序";
            button.setAttribute("aria-label", "创建时间");
        } else if (button.title === "按创建时间排序") {
            button.removeAttribute("title");
            button.removeAttribute("aria-label");
        }
    }
}

function applyHeader() {
    if (active && position() === "views") registerStyle(HEADER_STYLE, HEADER_CSS);
    else unregisterStyle(HEADER_STYLE);
    labelHeaders();
    syncSortState();
}

export function showCreatedTimes(rows: readonly TopicRow[]) {
    const where = position();
    const now = Date.now();
    for (const row of rows) show(row, where, now);
    if (active) {
        labelHeaders();
        syncSortState();
    }
}

let timer: ReturnType<typeof setInterval> | undefined;
let active = false;
let listeners: AbortController | null = null;

export default definePlugin({
    name: "CreatedTime",
    displayName: "话题列表显示创建时间",
    description: "在话题列表里显示每个话题的创建时间，可替换浏览量或追加在活动时间后，按新旧着色，三个月以上的话题带墓碑标记（来自 linuxdo-scripts）。",
    tags: ["topics"],
    icon: ClockIcon,
    enabledByDefault: true,
    settings,
    start() {
        active = true;
        listeners = new AbortController();
        // Capture on window: runs before Discourse's own handler on the header, which would sort by views.
        window.addEventListener("click", onHeaderClick, { capture: true, signal: listeners.signal });
        applyHeader();
        registerProcessor({ id: "created-time", run: showCreatedTimes });
        // Colours and the "today" format follow the clock, not only DOM changes.
        timer = setInterval(() => {
            if (document.visibilityState === "visible") showCreatedTimes(getRows());
        }, 60_000);
    },
    stop() {
        active = false;
        listeners?.abort();
        listeners = null;
        applyHeader();
        unregisterProcessor("created-time");
        clearInterval(timer);
        timer = undefined;
        for (const span of document.querySelectorAll(`.${TIME}`)) span.remove();
    },
    onSettingsChange() {
        applyHeader();
        showCreatedTimes(getRows());
    },
    events: {
        navigate: syncSortState,
    },
});
