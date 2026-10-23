/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s ResponseNotification and ChatStateFavicons, for LD++'s AI work: when a summary or a question finishes (or
// fails) a chime plays and the browser can show a system notification, by default only while the tab is in the
// background, since the toast already says so in front. The tab's icon carries a dot while anything runs (blue), and
// keeps a green or red one after a result that arrived in the background, until the tab is looked at again.

import { resolveTopicTitle } from "@api/Discourse";
import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { focusTopic } from "@api/TopicList";
import { Button } from "@components/controls";
import { BellIcon } from "@components/icons";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";

const logger = new Logger("CompletionAlert", "#a6e3a1");

export type TabState = "idle" | "running" | "done" | "error";

const DOT_COLOR: Record<Exclude<TabState, "idle">, string> = { running: "#3b82f6", done: "#22c55e", error: "#ef4444" };

function previewSound() {
    void playSound();
}

export const settings = definePluginSettings({
    sound: {
        type: OptionType.BOOLEAN,
        description: "完成或失败时播放提示音。",
        default: true,
    },
    soundUrl: {
        type: OptionType.STRING,
        description: "自定义提示音地址（留空使用内置提示音）。",
        placeholder: "https://example.com/done.mp3",
        default: "",
    },
    preview: {
        type: OptionType.COMPONENT,
        description: "试听",
        render: () => Button("试听提示音", { small: true, onClick: previewSound }),
    },
    systemNotification: {
        type: OptionType.BOOLEAN,
        description: "显示浏览器系统通知（首次开启时浏览器会询问权限）。",
        default: false,
        onChange: value => { if (value) void requestPermission(); },
    },
    onlyHidden: {
        type: OptionType.BOOLEAN,
        description: "只在标签页处于后台时提醒。",
        default: true,
    },
    favicon: {
        type: OptionType.BOOLEAN,
        description: "在标签页图标上显示状态圆点：进行中蓝色，后台完成绿色，失败红色。",
        default: true,
    },
});

async function requestPermission(): Promise<boolean> {
    if (typeof Notification === "undefined") {
        showToast("这个浏览器不支持系统通知。", "warning", { key: "completion-alert" });
        return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
        showToast("浏览器已禁止 linux.do 的通知，请在站点设置里允许后再试。", "warning", { key: "completion-alert" });
        return false;
    }
    return await Notification.requestPermission() === "granted";
}

let audio: AudioContext | null = null;

/** Two soft rising notes, made on the spot so nothing is downloaded. */
function chime() {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    audio ??= new Context();
    void audio.resume();
    const start = audio.currentTime + 0.02;
    for (const [index, frequency] of [880, 1318.5].entries()) {
        const at = start + index * 0.14;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(0.18, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 0.45);
        osc.connect(gain).connect(audio.destination);
        osc.start(at);
        osc.stop(at + 0.5);
    }
}

async function playSound() {
    const url = settings.store.soundUrl.trim();
    try {
        if (url) await new Audio(url).play();
        else chime();
    } catch (error) {
        // Browsers refuse sound before the page has had a click or key press.
        logger.warn("提示音播放失败", error);
    }
}

const KIND_LABEL = { summary: "总结", question: "提问" } as const;

async function systemNotify(kind: keyof typeof KIND_LABEL, topicId: string, ok: boolean, message?: string) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const title = await resolveTopicTitle(topicId).catch(() => "") || `话题 #${topicId}`;
    const notification = new Notification(ok ? `${KIND_LABEL[kind]}完成` : `${KIND_LABEL[kind]}失败`, {
        body: ok ? title : `${title}\n${message ?? ""}`.trim(),
        tag: `ldpp-${kind}-${topicId}`,
        icon: faviconLink()?.href,
    });
    notification.addEventListener("click", () => {
        window.focus();
        focusTopic(topicId, kind, ok ? "success" : "error");
        notification.close();
    });
}

/* Tab icon */

const running = new Set<string>();
let finished: Exclude<TabState, "idle" | "running"> | null = null;
let originalHref: string | null = null;
let baseImage: HTMLImageElement | null = null;
let shownState: TabState = "idle";

export function tabState(runningCount: number, result: typeof finished): TabState {
    if (runningCount > 0) return "running";
    return result ?? "idle";
}

function faviconLink(): HTMLLinkElement | null {
    return document.querySelector<HTMLLinkElement>("link[rel~='icon']");
}

function loadBase(href: string): Promise<HTMLImageElement | null> {
    if (baseImage?.dataset.src === href) return Promise.resolve(baseImage);
    return new Promise(resolve => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.dataset.src = href;
        img.addEventListener("load", () => { baseImage = img; resolve(img); });
        img.addEventListener("error", () => resolve(null));
        img.src = href;
    });
}

function drawIcon(base: HTMLImageElement | null, state: Exclude<TabState, "idle">): string | null {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    if (base) ctx.drawImage(base, 0, 0, 64, 64);
    ctx.beginPath();
    ctx.arc(46, 46, 16, 0, Math.PI * 2);
    ctx.fillStyle = DOT_COLOR[state];
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#fff";
    ctx.stroke();
    try {
        return canvas.toDataURL("image/png");
    } catch {
        // The site's icon came from another origin without CORS: the canvas is tainted. Draw the dot alone.
        return base ? drawIcon(null, state) : null;
    }
}

async function renderFavicon() {
    const state = settings.store.favicon && active ? tabState(running.size, finished) : "idle";
    if (state === shownState) return;
    shownState = state;
    const link = faviconLink();
    if (!link) return;
    if (state === "idle") {
        if (originalHref !== null) link.href = originalHref;
        originalHref = null;
        return;
    }
    originalHref ??= link.href;
    const href = drawIcon(await loadBase(originalHref), state);
    if (href && shownState === state) link.href = href;
}

function onVisible() {
    if (document.visibilityState !== "visible" || !finished) return;
    finished = null;
    void renderFavicon();
}

let active = false;

export default definePlugin({
    name: "CompletionAlert",
    displayName: "后台完成提醒",
    description: "AI 总结或提问完成、失败时播放提示音，可选弹出系统通知，标签页图标显示进度（对照 Void++ ResponseNotification 与 ChatStateFavicons）。",
    tags: ["ai"],
    icon: BellIcon,
    enabledByDefault: true,
    settings,
    start() {
        active = true;
        document.addEventListener("visibilitychange", onVisible);
    },
    stop() {
        active = false;
        running.clear();
        finished = null;
        document.removeEventListener("visibilitychange", onVisible);
        void renderFavicon();
    },
    onSettingsChange() {
        void renderFavicon();
    },
    events: {
        aiTask({ kind, topicId, state, message }) {
            const key = `${kind}:${topicId}`;
            if (state === "start") {
                running.add(key);
                void renderFavicon();
                return;
            }
            running.delete(key);
            const hidden = document.visibilityState === "hidden";
            if (state !== "cancel" && hidden) finished = state === "error" || finished === "error" ? "error" : "done";
            void renderFavicon();
            if (state === "cancel" || (settings.store.onlyHidden && !hidden)) return;
            if (settings.store.sound) void playSound();
            if (settings.store.systemNotification) void systemNotify(kind, topicId, state === "done", message);
        },
    },
});
