/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { pageWindow } from "@utils/misc";

import { dispatch } from "./Events";

export type PageKind = "topic" | "list" | "search" | "other";

export interface RouteInfo {
    url: string;
    path: string;
    kind: PageKind;
    topicId: string | null;
    searchQuery: string;
    key: string;
}

const logger = new Logger("Navigation");
const TOPIC_PATH = /^\/t\/(?:[^/]+\/)?(\d+)(?:\/\d+)?\/?$/;
const LIST_PATH = /^\/(?:$|latest|new|unread|unseen|top|hot|categories|bookmarks|c\/|tag\/|tags\/|u\/[^/]+\/(?:activity|summary|bookmarks))/;

export function parseRoute(href: string): RouteInfo {
    const url = new URL(href, "https://linux.do/");
    url.hash = "";
    const path = url.pathname;
    const topicMatch = path.match(TOPIC_PATH);
    const kind: PageKind = topicMatch ? "topic" : path.startsWith("/search") ? "search" : LIST_PATH.test(path) ? "list" : "other";
    const topicId = topicMatch?.[1] ?? null;
    return {
        url: url.href,
        path,
        kind,
        topicId,
        searchQuery: kind === "search" ? (url.searchParams.get("q") ?? "").trim() : "",
        key: topicId ? `topic:${topicId}` : `${path}${url.search}`,
    };
}

let current: RouteInfo | null = null;

export function currentRoute(): RouteInfo {
    const route = parseRoute(location.href);
    if (!current) current = route;
    return route;
}

export function checkRoute() {
    const next = parseRoute(location.href);
    if (current && next.key === current.key) {
        current = next;
        return;
    }
    const previous = current;
    current = next;
    dispatch("navigate", { route: next, previous });
}

function discourseRouter(): any {
    const container = (pageWindow as { Discourse?: { __container__?: { lookup(name: string): any } } }).Discourse?.__container__;
    return container?.lookup("service:router");
}

/** Goes to a path inside Discourse without reloading the page (a full load only if its router is not reachable). */
export function routeTo(path: string) {
    try {
        const router = discourseRouter();
        if (router?.transitionTo) {
            router.transitionTo(path);
            return;
        }
    } catch (error) {
        logger.warn("站内跳转失败，改为整页加载", error);
    }
    location.assign(path);
}

function hookDiscourseRouter(): boolean {
    try {
        const router = discourseRouter();
        if (!router?.on) return false;
        router.on("routeDidChange", () => queueMicrotask(checkRoute));
        return true;
    } catch (error) {
        logger.warn("无法挂接 Discourse 路由", error);
        return false;
    }
}

export function startNavigation() {
    current = parseRoute(location.href);
    window.addEventListener("popstate", checkRoute);
    window.addEventListener("pageshow", checkRoute);
    if (hookDiscourseRouter()) return;
    let tries = 0;
    const timer = setInterval(() => {
        if (hookDiscourseRouter() || ++tries > 20) clearInterval(timer);
    }, 500);
}
