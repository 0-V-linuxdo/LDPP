/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { asInt, asString, isObject } from "@utils/guards";
import { errorMessage, isAbortError, randomId, sleep } from "@utils/misc";

import { httpRequest } from "./Http";

export type ImageDetail = "auto" | "low" | "high";

export interface AIProfile {
    id: string;
    name: string;
    url: string;
    key: string;
    model: string;
    retryCount: number;
    retryInterval: number;
    imageInput: boolean;
    imageDetail: ImageDetail;
    maxImages: number;
    maxImageMB: number;
    maxTotalImageMB: number;
}

export type ChatPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail?: ImageDetail } };

export interface ChatMessage {
    role: "system" | "user" | "assistant";
    content: string | ChatPart[];
}

export type AIErrorCode = "NO_PROFILE" | "NO_KEY" | "HTTP" | "CONTENT_FILTER" | "BAD_RESPONSE" | "NETWORK";

export class AIError extends Error {
    constructor(message: string, readonly code: AIErrorCode, readonly retryable: boolean, readonly details = "") {
        super(message);
        this.name = "AIError";
    }
}

export interface RetryNotice {
    attempt: number;
    total: number;
    error: unknown;
}

const DETAILS: readonly ImageDetail[] = ["auto", "low", "high"];
const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 422]);

export const DEFAULT_PROFILE: Omit<AIProfile, "id"> = {
    name: "默认配置",
    url: "https://api.openai.com/v1/chat/completions",
    key: "",
    model: "gpt-4o-mini",
    retryCount: 3,
    retryInterval: 6,
    imageInput: false,
    imageDetail: "auto",
    maxImages: 6,
    maxImageMB: 4,
    maxTotalImageMB: 12,
};

export function normalizeProfile(raw: unknown): AIProfile {
    const source = isObject(raw) ? raw : {};
    const detail = asString(source.imageDetail) as ImageDetail;
    return {
        id: asString(source.id) || randomId("ai-"),
        name: asString(source.name) || DEFAULT_PROFILE.name,
        url: asString(source.url) || DEFAULT_PROFILE.url,
        key: asString(source.key),
        model: asString(source.model) || DEFAULT_PROFILE.model,
        retryCount: asInt(source.retryCount, DEFAULT_PROFILE.retryCount, 0, 10),
        retryInterval: asInt(source.retryInterval, DEFAULT_PROFILE.retryInterval, 1, 600),
        imageInput: source.imageInput === true,
        imageDetail: DETAILS.includes(detail) ? detail : "auto",
        maxImages: asInt(source.maxImages, DEFAULT_PROFILE.maxImages, 1, 20),
        maxImageMB: Math.min(20, Math.max(0.25, Number(source.maxImageMB) || DEFAULT_PROFILE.maxImageMB)),
        maxTotalImageMB: Math.min(60, Math.max(0.25, Number(source.maxTotalImageMB) || DEFAULT_PROFILE.maxTotalImageMB)),
    };
}

interface ProfileProvider {
    list(): AIProfile[];
    activeId(): string;
}

let provider: ProfileProvider = { list: () => [], activeId: () => "" };

export function configureAI(next: ProfileProvider) {
    provider = next;
}

export function getProfiles(): AIProfile[] {
    return provider.list();
}

export function getProfile(id?: string): AIProfile | null {
    const profiles = provider.list();
    return profiles.find(profile => profile.id === id) ?? profiles.find(profile => profile.id === provider.activeId()) ?? profiles[0] ?? null;
}

function extractContent(json: Record<string, unknown>): string {
    const choice = Array.isArray(json.choices) ? json.choices[0] as Record<string, unknown> | undefined : undefined;
    const message = isObject(choice?.message) ? choice.message : null;
    const content = message?.content;
    if (typeof content === "string" && content.trim()) return content;
    if (Array.isArray(content)) {
        const text = content.map(part => isObject(part) ? asString(part.text) : "").join("");
        if (text.trim()) return text;
    }
    const reason = asString(choice?.finish_reason);
    if (reason.toLowerCase().includes("content_filter")) throw new AIError(`模型内容安全策略拦截（${reason}）`, "CONTENT_FILTER", false, JSON.stringify(json, null, 2).slice(0, 4000));
    throw new AIError("接口返回格式不是 OpenAI 兼容的 choices[0].message.content", "BAD_RESPONSE", true, JSON.stringify(json, null, 2).slice(0, 4000));
}

export function requireProfile(profile: AIProfile | null): AIProfile {
    if (!profile) throw new AIError("尚未配置 AI 接口", "NO_PROFILE", false);
    if (!profile.key) throw new AIError(`AI 配置「${profile.name}」没有填写 API Key`, "NO_KEY", false);
    return profile;
}

export async function chat(target: AIProfile | null, messages: ChatMessage[], { signal }: { signal?: AbortSignal | null } = {}): Promise<string> {
    const profile = requireProfile(target);
    let res;
    try {
        res = await httpRequest({
            method: "POST",
            url: profile.url,
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${profile.key}` },
            body: JSON.stringify({ model: profile.model, messages, stream: false }),
            signal,
            credentials: "omit",
        });
    } catch (error) {
        if (isAbortError(error)) throw error;
        throw new AIError(errorMessage(error), "NETWORK", true);
    }
    if (!res.ok) throw new AIError(`AI 接口返回 HTTP ${res.status}`, "HTTP", !NON_RETRYABLE_STATUS.has(res.status), res.text.slice(0, 4000));
    let json: unknown;
    try { json = JSON.parse(res.text); } catch { throw new AIError("AI 接口返回的不是 JSON", "BAD_RESPONSE", true, res.text.slice(0, 4000)); }
    if (!isObject(json)) throw new AIError("AI 接口返回的不是 JSON 对象", "BAD_RESPONSE", true, res.text.slice(0, 4000));
    return extractContent(json);
}

export function isRetryable(error: unknown): boolean {
    if (isAbortError(error)) return false;
    if (error instanceof AIError) return error.retryable;
    return (error as { retryable?: boolean } | null)?.retryable !== false;
}

export async function chatWithRetry(profile: AIProfile | null, messages: ChatMessage[], { signal, onRetry }: { signal?: AbortSignal | null; onRetry?(notice: RetryNotice): void } = {}): Promise<string> {
    const total = profile?.retryCount ?? 0;
    for (let attempt = 0; ; attempt++) {
        try {
            return await chat(profile, messages, { signal });
        } catch (error) {
            if (attempt >= total || !isRetryable(error)) throw error;
            onRetry?.({ attempt: attempt + 1, total, error });
            await sleep((profile?.retryInterval ?? 5) * 1000, signal);
        }
    }
}

export function userContent(text: string, images: Array<{ url: string; detail: ImageDetail }>): string | ChatPart[] {
    if (!images.length) return text;
    return [{ type: "text", text }, ...images.map(image => ({ type: "image_url" as const, image_url: { url: image.url, detail: image.detail } }))];
}

export function describeError(error: unknown): string {
    const lines = [errorMessage(error)];
    if (error instanceof AIError && error.details) lines.push(error.details);
    if (error instanceof Error && error.stack && IS_DEV) lines.push(error.stack);
    return lines.join("\n\n");
}
