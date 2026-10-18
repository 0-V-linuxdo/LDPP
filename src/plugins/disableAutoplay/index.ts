/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「禁用视频自动播放」 from the unmaintained linuxdo-scripts (anghunk; MenuDisableAutoplay): Bilibili and YouTube players
// embedded in posts start with autoplay off. On linux.do these are raw <iframe src="https://player.bilibili.com/…">
// in posts (Bilibili's player plays on load, every one on the page at once); YouTube links are click-to-load.
//
// The original rewrote the iframes once a second, so a player could play for up to a second first. Here a
// MutationObserver turns autoplay off as the iframe is inserted, before it has loaded. A player the user has just
// clicked to load (YouTube's lazy video, Discourse's video placeholder) is left alone: there autoplay is the click's
// intent, and turning it off would only make the user click twice.

import { VideoOffIcon } from "@components/icons";
import { LDPP_ATTR } from "@utils/dom";
import definePlugin from "@utils/types";

const PLAYERS = "iframe[src*='player.bilibili.com'], iframe[src*='youtube.com/embed'], iframe[src*='youtube-nocookie.com/embed']";
const EMBEDS = `.cooked :is(${PLAYERS}), .cooked video[autoplay]`;
/** How long after a click inside a post a new player there counts as started by that click. */
const GESTURE_MS = 3000;

/** The embed URL with autoplay off, or null when it already is. */
export function withoutAutoplay(src: string, base = location.href): string | null {
    let url: URL;
    try { url = new URL(src, base); } catch { return null; }
    const value = url.searchParams.get("autoplay");
    if (value === "0" || value === "false") return null;
    url.searchParams.set("autoplay", "0");
    // Keep a protocol-relative src (「//player.bilibili.com/…」) as it was written.
    return src.startsWith("//") ? url.href.slice(url.protocol.length) : url.href;
}

let gesture: { post: Element | null; time: number } | null = null;

function onGesture(event: Event) {
    const target = event.target instanceof Element ? event.target : null;
    gesture = { post: target?.closest(".cooked") ?? null, time: Date.now() };
}

function startedByUser(el: Element): boolean {
    return Boolean(gesture?.post?.isConnected && gesture.post.contains(el) && Date.now() - gesture.time < GESTURE_MS);
}

export function quiet(el: Element) {
    if (startedByUser(el)) return;
    if (el instanceof HTMLVideoElement) {
        el.autoplay = false;
        if (!el.paused) el.pause();
        return;
    }
    const src = el.getAttribute("src");
    const next = src ? withoutAutoplay(src) : null;
    if (next) el.setAttribute("src", next);
}

function scan(node: Node) {
    if (!(node instanceof Element) || node.closest(`[${LDPP_ATTR}]`)) return;
    if (node.matches(EMBEDS)) quiet(node);
    for (const embed of node.querySelectorAll(EMBEDS)) quiet(embed);
}

let observer: MutationObserver | null = null;
let listeners: AbortController | null = null;

export default definePlugin({
    name: "DisableAutoplay",
    displayName: "禁用视频自动播放",
    description: "帖子里嵌入的 B 站、YouTube 播放器不再自动播放；点击加载的视频照常播放（来自 linuxdo-scripts）。",
    tags: ["reading"],
    icon: VideoOffIcon,
    enabledByDefault: true,
    start() {
        listeners = new AbortController();
        for (const type of ["pointerdown", "keydown"]) window.addEventListener(type, onGesture, { capture: true, signal: listeners.signal });
        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes") scan(mutation.target);
                else for (const node of mutation.addedNodes) scan(node);
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "autoplay"] });
        scan(document.documentElement);
    },
    stop() {
        observer?.disconnect();
        observer = null;
        listeners?.abort();
        listeners = null;
        gesture = null;
    },
});
