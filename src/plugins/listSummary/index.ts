/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { hasSummary, Summarized } from "@api/DataStore";
import { subscribe } from "@api/Events";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { flashRow, getPanelRow, registerDecorator, registerProcessor, removePanelRow, rowsForTopic, schedule, type TopicRow, unregisterDecorator, unregisterProcessor } from "@api/TopicList";
import { IconButton } from "@components/controls";
import { CloseIcon, CloudIcon, ListIcon, QuestionIcon, SparkIcon } from "@components/icons";
import { classes } from "@utils/css";
import { h } from "@utils/dom";
import definePlugin, { OptionType } from "@utils/types";

import { settings as toastSettings } from "../_core/notifications";
import { createQAPanel, type QAPanel } from "../topicQA";
import { hasRemoteSource, onSummaryState, operationStatus, summarizeTopic } from "../topicSummary/engine";
import { createSummaryView, type SummaryView } from "../topicSummary/view";

type View = "summary" | "question";

interface OpenPanel {
    view: View;
    content: SummaryView | QAPanel | null;
    host: HTMLElement | null;
}

export const settings = definePluginSettings({
    singleExpand: {
        type: OptionType.BOOLEAN,
        description: "只展开一个总结面板（打开新的会收起其他）。",
        default: true,
    },
    maxLines: {
        type: OptionType.SLIDER,
        description: "面板内容最多显示的行数，超出后在面板内滚动。",
        min: 4,
        max: 40,
        default: 14,
    },
    widthPercent: {
        type: OptionType.SLIDER,
        description: "面板宽度（相对话题列宽度）。",
        min: 40,
        max: 100,
        step: 5,
        unit: "%",
        default: 100,
    },
    autoSummarizeOnOpen: {
        type: OptionType.BOOLEAN,
        description: "展开还没有总结的话题时立即开始总结。",
        default: true,
    },
});

const open = new Map<string, OpenPanel>();
const unsubs: Array<() => void> = [];

function summaryLabel(topicId: string): { text: string; icon: Element; state: string } {
    if (operationStatus(topicId)) return { text: "总结中", icon: h("span", { class: "ldpp-spinner" }), state: "busy" };
    if (hasSummary(topicId)) return { text: "已总结", icon: SparkIcon(14), state: "done" };
    if (Summarized.has(topicId) && hasRemoteSource()) return { text: "云端", icon: CloudIcon(14), state: "remote" };
    return { text: "总结", icon: SparkIcon(14), state: "none" };
}

function renderSummaryButton(row: TopicRow, slot: HTMLElement) {
    const label = summaryLabel(row.id);
    const active = open.get(row.id)?.view === "summary";
    const signature = `${label.state}|${active}`;
    const existing = slot.firstElementChild as HTMLButtonElement | null;
    if (existing?.dataset.signature === signature) return;
    const button = h("button", {
        type: "button",
        class: classes("ldpp-row-btn ldpp-sum-btn", `is-${label.state}`, active && "is-active"),
        title: label.state === "done" ? "查看总结" : label.state === "busy" ? "正在总结，点击查看进度" : "AI 总结这个话题",
        dataset: { signature },
        attrs: { "aria-pressed": String(active) },
        on: { click: (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); toggle(row, "summary"); } },
    }, label.icon, h("span", null, label.text));
    slot.replaceChildren(button);
}

function renderQuestionButton(row: TopicRow, slot: HTMLElement) {
    if (!isPluginEnabled("TopicQA")) {
        slot.replaceChildren();
        return;
    }
    const active = open.get(row.id)?.view === "question";
    const existing = slot.firstElementChild as HTMLButtonElement | null;
    if (existing && existing.classList.contains("is-active") === active) return;
    slot.replaceChildren(IconButton(QuestionIcon(15), {
        title: "提问 / 追问",
        className: classes("ldpp-row-btn", !active && "ldpp-hover-only", active && "is-active"),
        pressed: active,
        onClick: event => {
            event.preventDefault();
            event.stopPropagation();
            toggle(row, "question");
        },
    }));
}

function refreshButtons(topicId: string) {
    for (const row of rowsForTopic(topicId)) {
        const summarySlot = row.el.querySelector<HTMLElement>(".ldpp-actions > [data-slot='list-summary']");
        const questionSlot = row.el.querySelector<HTMLElement>(".ldpp-actions > [data-slot='list-question']");
        if (summarySlot) renderSummaryButton(row, summarySlot);
        if (questionSlot) renderQuestionButton(row, questionSlot);
    }
}

function close(topicId: string) {
    const panel = open.get(topicId);
    panel?.content?.destroy();
    open.delete(topicId);
    removePanelRow(topicId);
    refreshButtons(topicId);
}

function mount(topicId: string, panel: OpenPanel, row: TopicRow) {
    const host = getPanelRow(row, true);
    if (!host) return;
    if (panel.host === host && panel.content?.el.isConnected) return;
    panel.content?.destroy();
    panel.host = host;
    const qaEnabled = isPluginEnabled("TopicQA");
    if (panel.view === "question" && !qaEnabled) panel.view = "summary";
    panel.content = panel.view === "question"
        ? createQAPanel(topicId, { variant: "list" })
        : createSummaryView(topicId, { variant: "list", onAsk: qaEnabled ? () => switchView(row, "question") : undefined });
    host.replaceChildren(h("div", {
        class: "ldpp-lsum",
        style: { "--ldpp-lines": String(settings.store.maxLines), "--ldpp-panel-width": `${settings.store.widthPercent}%` },
    }, h("div", { class: "ldpp-lsum-head" },
        h("span", { class: "ldpp-lsum-title" }, panel.view === "question" ? "提问 / 追问" : "AI 总结"),
        // The summary's actions, time and model share the title row instead of taking two more lines.
        panel.view === "summary" ? (panel.content as SummaryView).toolbar : null,
        IconButton(CloseIcon(14), { title: "收起", onClick: () => close(topicId) }),
    ), panel.content.el));
    if (panel.view === "question") (panel.content as QAPanel).focus();
}

function switchView(row: TopicRow, view: View) {
    const panel = open.get(row.id);
    if (!panel) return;
    panel.view = view;
    panel.host = null;
    mount(row.id, panel, row);
    refreshButtons(row.id);
}

export function openPanel(row: TopicRow, view: View) {
    if (settings.store.singleExpand) for (const id of Array.from(open.keys())) if (id !== row.id) close(id);
    const existing = open.get(row.id);
    if (existing) {
        if (existing.view !== view) switchView(row, view);
        return;
    }
    const panel: OpenPanel = { view, content: null, host: null };
    open.set(row.id, panel);
    mount(row.id, panel, row);
    refreshButtons(row.id);
    if (view === "summary" && settings.store.autoSummarizeOnOpen && !hasSummary(row.id) && !operationStatus(row.id)) void summarizeTopic(row.id);
}

function toggle(row: TopicRow, view: View) {
    if (open.get(row.id)?.view === view) close(row.id);
    else openPanel(row, view);
}

function keepPanels(rows: readonly TopicRow[]) {
    for (const [topicId, panel] of open) {
        const row = rows.find(item => item.id === topicId && item.el.isConnected);
        if (!row) {
            panel.content?.destroy();
            open.delete(topicId);
            continue;
        }
        mount(topicId, panel, row);
    }
}

export default definePlugin({
    name: "ListSummary",
    displayName: "列表 AI 总结",
    description: "在话题列表的每一行加入「总结」与「提问」按钮，直接在行下方展开总结、历史与问答，不用逐个打开话题。",
    tags: ["ai", "topics"],
    icon: ListIcon,
    enabledByDefault: true,
    dependencies: ["TopicSummary"],
    settings,
    start() {
        registerDecorator({ id: "list-question", order: 30, render: renderQuestionButton });
        registerDecorator({ id: "list-summary", order: 40, render: renderSummaryButton });
        registerProcessor({ id: "list-summary-panels", run: keepPanels });
        unsubs.push(
            onSummaryState(refreshButtons),
            subscribe("dataChange", ({ store, ids }) => {
                if (store === "summaries" || store === "summarized") for (const id of ids) refreshButtons(id);
            }),
        );
    },
    stop() {
        for (const unsub of unsubs.splice(0)) unsub();
        for (const id of Array.from(open.keys())) close(id);
        unregisterDecorator("list-question");
        unregisterDecorator("list-summary");
        unregisterProcessor("list-summary-panels");
    },
    onSettingsChange() {
        for (const [topicId, panel] of open) {
            panel.host?.querySelector<HTMLElement>(".ldpp-lsum")?.style.setProperty("--ldpp-lines", String(settings.store.maxLines));
            panel.host?.querySelector<HTMLElement>(".ldpp-lsum")?.style.setProperty("--ldpp-panel-width", `${settings.store.widthPercent}%`);
            refreshButtons(topicId);
        }
    },
    events: {
        navigate() {
            for (const id of Array.from(open.keys())) close(id);
        },
        focusTopic(event) {
            if (event.handled || event.view === "locate" || !toastSettings.store.clickExpands) return;
            const row = rowsForTopic(event.topicId).find(item => !item.hidden);
            if (!row) return;
            event.handled = true;
            row.el.scrollIntoView({ block: "center", behavior: "smooth" });
            flashRow(row);
            openPanel(row, event.view);
        },
        pluginToggle({ name }) {
            if (name !== "TopicQA") return;
            for (const id of Array.from(open.keys())) close(id);
            schedule();
        },
    },
});
