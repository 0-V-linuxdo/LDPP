/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describeError } from "@api/AI";
import { Summaries, Summarized } from "@api/DataStore";
import { subscribe } from "@api/Events";
import { showToast } from "@api/Notifications";
import { Button, copyWithFeedback, IconButton } from "@components/controls";
import { ChevronLeftIcon, ChevronRightIcon, CloudIcon, CopyIcon, QuestionIcon, RefreshIcon, SparkIcon, StopIcon } from "@components/icons";
import { append, h, trackScrollbar } from "@utils/dom";
import { renderContent } from "@utils/markdown";
import { errorMessage } from "@utils/misc";
import { formatTime } from "@utils/text";

import { cancelSummary, hasRemoteSource, lastError, onSummaryState, operationStatus, pullRemote, summarizeTopic } from "./engine";

export interface SummaryViewOptions {
    variant: "sidebar" | "list";
    onAsk?(): void;
}

export interface SummaryView {
    readonly el: HTMLElement;
    /** The actions row; the list panel moves it into its title row (it keeps updating wherever it is). */
    readonly toolbar: HTMLElement;
    destroy(): void;
}

export function createSummaryView(topicId: string, { variant, onAsk }: SummaryViewOptions): SummaryView {
    const el = h("div", { class: `ldpp-sv ldpp-sv-${variant}`, dataset: { topicId } });
    const toolbar = h("div", { class: "ldpp-sv-toolbar" });
    const body = h("div", { class: "ldpp-sv-body" });
    el.append(toolbar, body);
    let index = 0;
    let signature = "";
    let pulling = false;
    let seenConnected = false;

    const render = () => {
        const list = Summaries.get(topicId) ?? [];
        index = Math.min(index, Math.max(0, list.length - 1));
        const status = operationStatus(topicId);
        const error = status ? null : lastError(topicId);
        const record = list[index];
        const next = `${status}|${error ? errorMessage(error) : ""}|${list.length}|${index}|${record?.timestamp ?? ""}|${pulling}`;
        if (next === signature) return;
        signature = next;
        toolbar.replaceChildren();
        const meta = record ? `🕒 ${formatTime(record.timestamp)} · 🤖 ${record.model}` : "";
        // In the list panel the time and model sit at the end of the actions row, not on a line of their own.
        const inlineMeta = variant === "list" && meta;
        // 重新总结 and 停止 are icons like 复制 and 提问 beside them, so the actions share one row even in a sidebar as
        // narrow as Discourse's (停止 is the same ■ as the question composer's); only the first 生成总结 stays labelled.
        append(toolbar,
            status
                ? IconButton(StopIcon(14), { title: "停止总结", onClick: () => cancelSummary(topicId) })
                : list.length
                    ? IconButton(RefreshIcon(15), { title: "重新总结", onClick: () => void summarizeTopic(topicId, { force: true }) })
                    : Button("生成总结", { small: true, kind: "primary", icon: SparkIcon(14), onClick: () => void summarizeTopic(topicId) }),
            record ? IconButton(CopyIcon(15), { title: "复制总结原文", onClick: event => void copyWithFeedback(event.currentTarget as HTMLElement, record.summary) }) : null,
            onAsk ? IconButton(QuestionIcon(16), { title: "提问 / 追问", onClick: onAsk }) : null,
            h("span", { class: "ldpp-sv-spacer" }),
            inlineMeta ? h("span", { class: "ldpp-sv-meta", title: meta }, meta) : null,
            list.length > 1 ? h("span", { class: "ldpp-sv-nav" },
                IconButton(ChevronLeftIcon(14), { title: "较新", onClick: () => { index = Math.max(0, index - 1); render(); } }),
                h("span", { class: "ldpp-sv-count" }, `${index + 1} / ${list.length}`),
                IconButton(ChevronRightIcon(14), { title: "较旧", onClick: () => { index = Math.min(list.length - 1, index + 1); render(); } }),
            ) : null,
        );
        body.replaceChildren();
        if (status) {
            append(body, h("div", { class: "ldpp-sv-loading" }, h("span", { class: "ldpp-spinner" }), h("span", null, status)), record ? h("div", { class: "ldpp-sv-stale" }, "（下方为上一次的总结）") : null);
        } else if (error) {
            const details = describeError(error);
            append(body, h("div", { class: "ldpp-error-box" },
                h("strong", null, `总结失败：${errorMessage(error)}`),
                h("details", null, h("summary", null, "完整报错"), h("pre", { class: "ldpp-pre" }, details)),
                h("div", { class: "ldpp-row-actions" },
                    Button("重试", { small: true, kind: "primary", onClick: () => void summarizeTopic(topicId, { force: true }) }),
                    Button("复制报错", { small: true, onClick: event => void copyWithFeedback(event.currentTarget as HTMLElement, details) }),
                ),
            ));
        }
        if (record) {
            append(body,
                trackScrollbar(h("div", { class: "ldpp-content ldpp-sv-content", innerHTML: renderContent(record.summary, record.renderMode) })),
                inlineMeta ? null : h("p", { class: "ldpp-sv-meta" }, meta),
            );
        } else if (!status && !error) {
            append(body, h("div", { class: "ldpp-sv-empty" },
                h("p", null, Summarized.has(topicId) && hasRemoteSource() ? "本地还没有这个话题的总结，云端可能有记录。" : "还没有总结。"),
                Summarized.has(topicId) && hasRemoteSource() ? Button(pulling ? "拉取中…" : "从云端拉取", {
                    small: true,
                    icon: CloudIcon(14),
                    disabled: pulling,
                    onClick: async () => {
                        pulling = true;
                        render();
                        const ok = await pullRemote(topicId).catch(() => false);
                        pulling = false;
                        render();
                        if (!ok) showToast("云端没有找到这个话题的总结", "warning", { topicId });
                    },
                }) : null,
            ));
        }
    };

    const onChange = (changed: string) => {
        if (changed !== topicId) return;
        if (!el.isConnected) {
            if (seenConnected) view.destroy();
            return;
        }
        seenConnected = true;
        render();
    };
    const unsubs = [
        onSummaryState(onChange),
        subscribe("dataChange", ({ store, ids }) => {
            if ((store === "summaries" || store === "summarized") && ids.includes(topicId)) onChange(topicId);
        }),
        subscribe("summaryUpdated", ({ topicId: id }) => {
            if (id !== topicId) return;
            index = 0;
            onChange(id);
        }),
    ];
    const view: SummaryView = {
        el,
        toolbar,
        destroy() {
            for (const unsub of unsubs.splice(0)) unsub();
        },
    };
    render();
    return view;
}
