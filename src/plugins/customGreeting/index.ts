/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The welcome-banner greeting, from the user's 「[LinuxDo] 问候语自定义」 userscript (AI-Greeting-Customizer), with the
// settings and rotation of Void++'s CustomGreeting: a list of greetings shown in order or at random, switched on each
// visit to the home page, on a timer while there, or by clicking the title.
//
// .welcome-banner__title holds only a text node, so the greeting is drawn by ::after laid over it in one grid cell
// (the script's approach): the cell grows with a multi-line greeting and nothing is clipped or absolutely placed.

import { dispatch } from "@api/Events";
import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { MessageCircleIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

const TITLE = ".welcome-banner__title";
const STYLE = "customGreeting-banner";
/** The <style> the original userscript injects; while it is there, both would paint the banner. */
const LEGACY_STYLE_ID = "gc-greeting-style-v1";
/** Pages where entering counts as "visiting home" (the script's list, plus linux.do's /hot). */
const HOME_PATHS = new Set(["/", "/latest", "/top", "/new", "/unread", "/hot", "/categories"]);

export const DEFAULT_GREETINGS = [
    "Ask not what your country can do for you\\n— ask what you can do for your country.",
    "It always seems impossible until it is done.",
    "The best way to predict the future is to create it.",
].join("\n");

export const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "切换时机",
        options: [
            { label: "每次进入首页时", value: "refresh", default: true },
            { label: "停留在首页时定时切换", value: "interval" },
            { label: "点击标题切换", value: "manual" },
        ],
    },
    order: {
        type: OptionType.SELECT,
        description: "切换顺序",
        options: [
            { label: "顺序", value: "sequential", default: true },
            { label: "随机", value: "random" },
        ],
    },
    intervalSec: {
        type: OptionType.NUMBER,
        description: "定时切换的间隔（仅「停留在首页时定时切换」）",
        min: 1,
        max: 3600,
        unit: "秒",
        default: 10,
    },
    phrases: {
        type: OptionType.STRING,
        multiline: true,
        description: "问候语：每行一条，\\n 表示换行；留空则显示站点原文",
        default: DEFAULT_GREETINGS,
    },
    greetIndex: { type: OptionType.CUSTOM, default: -1 },
    lastRandom: { type: OptionType.CUSTOM, default: -1 },
});

/** One greeting per line; a literal `\n` inside a line is a line break (the original allowed multi-line greetings). */
export function parseGreetings(raw: unknown): string[] {
    return String(raw ?? "").split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => line.replaceAll("\\n", "\n"));
}

export function escapeForCssContent(text: string): string {
    return text.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"").replaceAll("\n", "\\A ");
}

export function greetingCss(text: string, clickable: boolean): string {
    return `${TITLE} {
    display: grid !important;
    grid-template-rows: auto !important;
    grid-auto-rows: 0 !important;
    color: transparent !important;
}
${TITLE}::after {
    content: "${escapeForCssContent(text)}";
    grid-row: 1 !important;
    grid-column: 1 !important;
    justify-self: center !important;
    align-self: center !important;
    font-size: inherit !important;
    line-height: inherit !important;
    font-weight: inherit !important;
    color: var(--primary) !important;
    white-space: pre-wrap !important;
    text-align: center !important;
}${clickable ? `
${TITLE} {
    cursor: pointer !important;
    user-select: none !important;
}` : ""}`;
}

type Mode = "refresh" | "interval" | "manual";
const mode = (): Mode => (["interval", "manual"].includes(String(settings.store.mode)) ? settings.store.mode : "refresh") as Mode;
const greetings = () => parseGreetings(settings.store.phrases);
const isHome = () => HOME_PATHS.has(location.pathname.replace(/\/+$/, "") || "/");

/**
 * Void++ pickNextIndex: keeps the shown greeting, or advances in order / at random without repeating the last one.
 * Unlike Void++, the greeting shown before any advance is recorded too, so the first click or tick moves on from it
 * instead of showing it again.
 */
export function pickNextIndex(length: number, advance: boolean, random = Math.random): number {
    if (length <= 0) return 0;
    const current = Number(settings.store.greetIndex ?? -1);
    if (length === 1) {
        settings.store.greetIndex = 0;
        return 0;
    }
    if (!advance) {
        if (current >= 0 && current < length) return current;
        settings.store.greetIndex = 0;
        return 0;
    }
    if (settings.store.order === "random") {
        const previous = current >= 0 && current < length ? current : Number(settings.store.lastRandom ?? -1);
        let next = Math.floor(random() * length);
        for (let guard = 0; next === previous && guard < 10; guard++) next = Math.floor(random() * length);
        settings.store.greetIndex = next;
        settings.store.lastRandom = next;
        return next;
    }
    const next = ((current >= -1 && current < length ? current : -1) + 1) % length;
    settings.store.greetIndex = next;
    return next;
}

let active = false;
let wasHome = false;
let timer: ReturnType<typeof setInterval> | undefined;
let listeners: AbortController | null = null;
let warnedLegacy = false;

function paint(advance: boolean) {
    const list = greetings();
    if (!active || !list.length) {
        unregisterStyle(STYLE);
        return;
    }
    const index = pickNextIndex(list.length, advance);
    registerStyle(STYLE, greetingCss(list[index] ?? list[0], mode() === "manual" && list.length > 1));
}

function stopTimer() {
    if (timer !== undefined) clearInterval(timer);
    timer = undefined;
}

function startTimerIfNeeded() {
    stopTimer();
    if (!active || !isHome() || mode() !== "interval" || greetings().length <= 1) return;
    const seconds = Math.min(3600, Math.max(1, Number(settings.store.intervalSec) || 10));
    timer = setInterval(() => paint(true), seconds * 1000);
}

function warnLegacy() {
    if (warnedLegacy || !document.getElementById(LEGACY_STYLE_ID)) return;
    warnedLegacy = true;
    showToast("「问候语自定义」脚本仍在运行，会和 LD++ 同时改写欢迎横幅；LD++ 已内置这个功能，请在脚本管理器中停用旧脚本。", "warning", { key: "custom-greeting-legacy" });
}

/** Rotation follows home visits: advance on arriving (refresh mode), keep the timer only while there. */
function onRoute() {
    const home = isHome();
    if (home && !wasHome) {
        paint(mode() === "refresh");
        startTimerIfNeeded();
    } else if (!home && wasHome) {
        stopTimer();
    }
    wasHome = home;
    warnLegacy();
}

function onClick(event: MouseEvent) {
    if (mode() !== "manual" || greetings().length <= 1) return;
    if (!(event.target instanceof Element) || !event.target.closest(TITLE)) return;
    if (String(window.getSelection?.() ?? "").trim()) return;
    paint(true);
}

/** The original opened its manager with a right double-click on the title; here that opens this plugin's settings. */
function onContextMenu() {
    let last = 0;
    return (event: MouseEvent) => {
        if (!(event.target instanceof Element) || !event.target.closest(TITLE)) return;
        event.preventDefault();
        const now = Date.now();
        if (now - last <= 400) {
            last = 0;
            dispatch("openSettings", { tab: "features", plugin: "CustomGreeting" });
            return;
        }
        last = now;
    };
}

export default definePlugin({
    name: "CustomGreeting",
    displayName: "问候语自定义",
    description: "自定义首页欢迎横幅的问候语：多条文案按顺序或随机轮播，进入首页、定时或点击标题时切换；右键双击标题打开这里的设置。",
    tags: ["reading"],
    icon: MessageCircleIcon,
    enabledByDefault: true,
    settings,
    start() {
        active = true;
        wasHome = false;
        listeners = new AbortController();
        document.addEventListener("click", onClick, { signal: listeners.signal });
        document.addEventListener("contextmenu", onContextMenu(), { signal: listeners.signal });
        // On a home page onRoute paints (advancing in refresh mode); elsewhere show the current greeting as is.
        onRoute();
        if (!isHome()) paint(false);
    },
    stop() {
        active = false;
        wasHome = false;
        listeners?.abort();
        listeners = null;
        stopTimer();
        unregisterStyle(STYLE);
    },
    events: {
        navigate: onRoute,
    },
    onSettingsChange() {
        paint(false);
        startTimerIfNeeded();
    },
});
