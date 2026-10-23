/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s ExportChat for linux.do topics: an 「导出」 button among the buttons under a topic (书签 / 分享 / 回复)
// saves every floor as Markdown, HTML, plain text or JSON, with each floor's number, author and time, and optionally
// the topic's latest AI summary on top. The posts come from Discourse's JSON (the same reader the summary uses), so
// floors that are not on screen are included.

import "./styles.css";

import { Summaries } from "@api/DataStore";
import { fetchAllPosts, rememberTopicTitle } from "@api/Discourse";
import { currentRoute } from "@api/Navigation";
import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { DownloadIcon } from "@components/icons";
import { h, mark } from "@utils/dom";
import { Logger } from "@utils/Logger";
import { downloadText, errorMessage } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

import { type ExportFormat, exportFileName, FORMATS, renderExport } from "./format";

const logger = new Logger("TopicExport", "#f9e2af");
const BUTTON = "ldpp-export-button";
const FOOTER = "#topic-footer-buttons .topic-footer-main-buttons, #topic-footer-buttons .topic-footer-main-buttons__actions";

export const settings = definePluginSettings({
    includeSummary: {
        type: OptionType.BOOLEAN,
        description: "导出时在开头附上该话题最新一次 AI 总结（如果有）。",
        default: true,
    },
});

let busy = false;

export async function exportTopic(topicId: string, format: ExportFormat) {
    if (busy) return;
    busy = true;
    const toast = showToast("正在读取话题全部楼层…", "loading", { topicId, key: `export:${topicId}` });
    try {
        const { title, posts } = await fetchAllPosts(topicId, {
            onRetry: info => toast.update(`linux.do 限流，${info.delaySeconds} 秒后重试（${info.attempt}/${info.total}）…`, "loading"),
        });
        rememberTopicTitle(topicId, title);
        const summary = settings.store.includeSummary ? Summaries.get(topicId)?.[0]?.summary : undefined;
        const topic = { topicId, title, url: `${location.origin}/t/topic/${topicId}`, posts, summary, exportedAt: new Date() };
        const spec = FORMATS.find(item => item.id === format) ?? FORMATS[0];
        downloadText(renderExport(topic, spec.id), exportFileName(topic, spec.id), spec.mime);
        toast.update(`已导出 ${posts.length} 楼（${spec.label}）`, "success");
    } catch (error) {
        logger.error("导出失败", error);
        toast.update(`导出失败：${errorMessage(error)}`, "error");
    } finally {
        busy = false;
    }
}

let openMenu: HTMLElement | null = null;

function closeMenu() {
    openMenu?.remove();
    openMenu = null;
    document.removeEventListener("pointerdown", onOutside, true);
}

function onOutside(event: Event) {
    if (event.target instanceof Node && (openMenu?.contains(event.target) || (event.target as Element).closest?.(`.${BUTTON}`))) return;
    closeMenu();
}

function toggleMenu(button: HTMLElement) {
    if (openMenu) return closeMenu();
    const topicId = currentRoute().topicId;
    if (!topicId) return;
    const menu = mark(h("div", { class: "ldpp-export-menu", attrs: { role: "menu" } },
        ...FORMATS.map(item => h("button", {
            type: "button",
            class: "ldpp-export-item",
            attrs: { role: "menuitem" },
            on: { click: () => { closeMenu(); void exportTopic(topicId, item.id); } },
        }, item.label))), "export-menu");
    // Fixed to the viewport beside the button: the footer may clip or re-render, and Ember owns its children.
    const rect = button.getBoundingClientRect();
    menu.style.left = `${Math.round(rect.left)}px`;
    menu.style.bottom = `${Math.round(window.innerHeight - rect.top + 4)}px`;
    document.body.append(menu);
    openMenu = menu;
    document.addEventListener("pointerdown", onOutside, true);
    window.addEventListener("scroll", () => closeMenu(), { once: true, passive: true });
}

function ensureButton() {
    if (currentRoute().kind !== "topic") return;
    const footer = document.querySelector(FOOTER);
    if (!footer || footer.querySelector(`:scope > .${BUTTON}`)) return;
    const button = mark(h("button", {
        type: "button",
        class: `btn btn-default btn-icon-text ${BUTTON}`,
        title: "导出整个话题（Markdown / HTML / 纯文本 / JSON）",
        attrs: { "aria-haspopup": "menu" },
        on: { click: (event: MouseEvent) => toggleMenu(event.currentTarget as HTMLElement) },
    }, DownloadIcon(14), h("span", { class: "d-button-label" }, "导出")), "export-button");
    footer.append(button);
}

let observer: MutationObserver | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export default definePlugin({
    name: "TopicExport",
    displayName: "话题导出",
    description: "在话题底部加「导出」按钮，把全部楼层存成 Markdown、HTML、纯文本或 JSON，含楼层号、作者和时间，可附上 AI 总结（对照 Void++ ExportChat）。",
    tags: ["reading"],
    icon: DownloadIcon,
    enabledByDefault: true,
    settings,
    start() {
        // The footer is rendered (and re-rendered) by Ember after the posts, so watch for it rather than wait once.
        observer = new MutationObserver(() => { timer ??= setTimeout(() => { timer = undefined; ensureButton(); }, 150); });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        ensureButton();
    },
    stop() {
        observer?.disconnect();
        observer = null;
        clearTimeout(timer);
        timer = undefined;
        closeMenu();
        for (const button of document.querySelectorAll(`.${BUTTON}`)) button.remove();
    },
    events: {
        navigate: () => closeMenu(),
    },
});
