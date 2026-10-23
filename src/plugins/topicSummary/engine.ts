/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { AIError, type AIProfile, type ChatMessage, chatWithRetry, getProfile, requireProfile, userContent } from "@api/AI";
import { rememberTopicTitle } from "@api/Discourse";
import { addSummary, hasSummary, Summarized } from "@api/DataStore";
import { prepareImages } from "@api/Images";
import { currentRoute } from "@api/Navigation";
import { showToast, type ToastHandle } from "@api/Notifications";
import { buildTopicContent, type TopicContent } from "@api/TopicContent";
import { focusTopic } from "@api/TopicList";
import { Logger } from "@utils/Logger";
import { abortError, errorMessage, isAbortError, randomId } from "@utils/misc";

import { type PromptConfig, renderModeOf, stripFences } from "./prompts";

export type SummaryMode = "manual" | "auto";

export interface EngineConfig {
    prompt(): PromptConfig;
    maxPosts(): number;
    filter(): { enabled: boolean; prefixes: string[]; suffixes: string[] };
}

interface Operation {
    id: string;
    topicId: string;
    mode: SummaryMode;
    controller: AbortController;
    status: string;
    toast: ToastHandle;
}

export type RemoteSource = (topicId: string, signal: AbortSignal) => Promise<boolean>;

const logger = new Logger("Summary", "#89dceb");
const operations = new Map<string, Operation>();
const errors = new Map<string, unknown>();
const listeners = new Set<(topicId: string) => void>();
const remoteSources = new Set<RemoteSource>();

let config: EngineConfig | null = null;

export function configureEngine(next: EngineConfig) {
    config = next;
}

export function registerRemoteSource(source: RemoteSource): () => void {
    remoteSources.add(source);
    return () => remoteSources.delete(source);
}

export function hasRemoteSource(): boolean {
    return remoteSources.size > 0;
}

export function onSummaryState(listener: (topicId: string) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function notify(topicId: string) {
    for (const listener of Array.from(listeners)) {
        try { listener(topicId); } catch (error) { logger.error("状态监听出错", error); }
    }
}

export function operationStatus(topicId: string): string | null {
    return operations.get(topicId)?.status ?? null;
}

const isConfigError = (error: unknown) => error instanceof AIError && (error.code === "NO_KEY" || error.code === "NO_PROFILE");

export function lastError(topicId: string): unknown {
    return errors.get(topicId);
}

export function cancelSummary(topicId: string) {
    const op = operations.get(topicId);
    if (!op) return;
    op.controller.abort();
}

export async function pullRemote(topicId: string, signal?: AbortSignal): Promise<boolean> {
    for (const source of remoteSources) {
        try {
            if (await source(topicId, signal ?? new AbortController().signal) && hasSummary(topicId)) return true;
        } catch (error) {
            if (isAbortError(error)) throw error;
            logger.warn(`远端拉取话题 ${topicId} 失败`, error);
        }
    }
    return false;
}

export function buildSummaryMessages(prompt: PromptConfig, content: TopicContent, images: Array<{ url: string; detail: AIProfile["imageDetail"] }>, maxPosts: number): ChatMessage[] {
    const header = [
        `话题标题：${content.title || "（未知）"}`,
        `话题 ID：${content.topicId}`,
        `共 ${content.postCount} 楼${content.truncated ? `，为控制长度只提供前 ${maxPosts} 楼` : ""}。`,
        images.length ? `本次附带 ${images.length} 张话题图片，正文中的 [图片#N] 与之按编号对应。` : "",
    ].filter(Boolean).join("\n");
    return [
        { role: "system", content: [prompt.system, prompt.format].filter(Boolean).join("\n\n") },
        { role: "user", content: userContent(`${header}\n\n原文如下：\n${content.text}`, images) },
    ];
}

export async function summarizeTopic(topicId: string, { mode = "manual", force = false }: { mode?: SummaryMode; force?: boolean } = {}): Promise<boolean> {
    if (!config) throw new Error("总结引擎尚未配置");
    const running = operations.get(topicId);
    if (running && !force) {
        showToast("该话题正在总结中，请稍候…", "info", { topicId });
        return false;
    }
    running?.toast.close();
    running?.controller.abort();
    const controller = new AbortController();
    const op: Operation = {
        id: randomId("op-"),
        topicId,
        mode,
        controller,
        status: "准备中…",
        toast: showToast(mode === "auto" ? "正在自动总结…" : "正在生成总结…", "loading", {
            topicId,
            key: `summary:${topicId}`,
            onDismiss: () => controller.abort(),
            onClick: type => focusTopic(topicId, "summary", type),
        }),
    };
    operations.set(topicId, op);
    errors.delete(topicId);
    const { signal } = controller;
    const setStatus = (status: string) => {
        if (operations.get(topicId) !== op) return;
        op.status = status;
        op.toast.update(status, "loading");
        notify(topicId);
    };
    const guard = () => {
        if (signal.aborted) throw abortError("总结已取消");
        if (mode === "auto" && currentRoute().topicId !== topicId) throw abortError("已离开话题，自动总结取消");
    };
    notify(topicId);
    try {
        if (!hasSummary(topicId) && Summarized.has(topicId) && hasRemoteSource()) {
            setStatus("正在从云端拉取已有总结…");
            if (await pullRemote(topicId, signal)) {
                op.toast.update("已从云端拉取总结", "success");
                return true;
            }
            guard();
        }
        const profile = requireProfile(getProfile());
        const maxPosts = config.maxPosts();
        setStatus("正在读取话题内容…");
        const content = await buildTopicContent(topicId, {
            signal,
            maxPosts,
            retries: profile.retryCount,
            onRetry: info => setStatus(`linux.do 限流，${info.delaySeconds} 秒后重试（${info.attempt}/${info.total}）…`),
        });
        rememberTopicTitle(topicId, content.title);
        guard();
        let images: Array<{ url: string; detail: AIProfile["imageDetail"] }> = [];
        if (profile.imageInput && content.images.length) {
            setStatus(`正在准备图片（${content.images.length} 张）…`);
            images = (await prepareImages(content.images, profile, signal)).prepared;
            guard();
        }
        const prompt = config.prompt();
        setStatus("AI 正在生成总结…");
        const raw = await chatWithRetry(profile, buildSummaryMessages(prompt, content, images, maxPosts), {
            signal,
            onRetry: notice => {
                if (mode === "auto" && hasSummary(topicId)) controller.abort();
                setStatus(`生成失败（${errorMessage(notice.error)}），${profile.retryInterval} 秒后第 ${notice.attempt}/${notice.total} 次重试…`);
            },
        });
        guard();
        if (mode === "auto" && hasSummary(topicId)) {
            op.toast.update("已有总结，已停止自动总结", "success");
            return true;
        }
        const filter = config.filter();
        const summary = filter.enabled ? stripFences(raw, filter.prefixes, filter.suffixes) : raw.trim();
        addSummary(topicId, { summary, timestamp: new Date().toISOString(), model: profile.model || "未知模型", renderMode: renderModeOf(prompt, summary) });
        op.toast.update(mode === "auto" ? "自动总结完成" : "总结完成", "success");
        return true;
    } catch (error) {
        if (isAbortError(error)) {
            op.toast.close();
            return false;
        }
        errors.set(topicId, error);
        if (mode === "auto" && isConfigError(error)) {
            logger.info(`话题 ${topicId} 未自动总结：${errorMessage(error)}`);
            op.toast.close();
            return false;
        }
        logger.error(`话题 ${topicId} 总结失败`, error);
        op.toast.update(`总结失败：${errorMessage(error)}`, "error");
        return false;
    } finally {
        if (operations.get(topicId) === op) operations.delete(topicId);
        notify(topicId);
    }
}
