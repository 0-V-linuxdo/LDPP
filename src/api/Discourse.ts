/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isObject } from "@utils/guards";
import { sleep } from "@utils/misc";
import { normalizeText } from "@utils/text";

export interface RetryInfo {
    attempt: number;
    total: number;
    delaySeconds: number;
}

export interface DiscourseRequestOptions {
    signal?: AbortSignal | null;
    retries?: number;
    onRetry?(info: RetryInfo): void;
}

export interface TopicPost {
    id: number;
    post_number: number;
    username: string;
    cooked: string;
    raw?: string;
    reply_to_user?: { username?: string } | null;
}

export interface TopicJson {
    id: number;
    title: string;
    fancy_title?: string;
    post_stream: { posts: TopicPost[]; stream?: number[] };
}

export class DiscourseError extends Error {
    constructor(message: string, readonly status: number, readonly code: "RATE_LIMITED" | "HTTP_ERROR" | "BAD_RESPONSE") {
        super(message);
        this.name = "DiscourseError";
    }
}

const BASE_DELAY_SECONDS = 10;
const CHUNK = 100;
const titleCache = new Map<string, string>();
const titleRequests = new Map<string, Promise<string>>();

function headers(): Record<string, string> {
    const out: Record<string, string> = {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
        "Discourse-Present": "true",
    };
    const csrf = document.querySelector<HTMLMetaElement>("meta[name='csrf-token']")?.content;
    if (csrf) out["X-CSRF-Token"] = csrf;
    return out;
}

export async function discourseJson<T>(path: string, { signal, retries = 3, onRetry }: DiscourseRequestOptions = {}): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        const res = await fetch(new URL(path, location.origin).href, { credentials: "include", headers: headers(), signal: signal ?? undefined });
        if (res.status === 429) {
            if (attempt >= retries) throw new DiscourseError(`linux.do 接口限流（429），已重试 ${retries} 次`, 429, "RATE_LIMITED");
            const retryAfter = Number(res.headers.get("retry-after"));
            const delaySeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : BASE_DELAY_SECONDS * 2 ** attempt;
            onRetry?.({ attempt: attempt + 1, total: retries, delaySeconds });
            await sleep(delaySeconds * 1000, signal);
            continue;
        }
        if (!res.ok) throw new DiscourseError(`linux.do 接口返回 HTTP ${res.status}`, res.status, "HTTP_ERROR");
        const json = await res.json().catch(() => null);
        if (!isObject(json)) throw new DiscourseError("linux.do 接口返回了无法解析的内容", res.status, "BAD_RESPONSE");
        return json as T;
    }
}

export async function fetchTopic(topicId: string, options?: DiscourseRequestOptions): Promise<TopicJson> {
    const topic = await discourseJson<TopicJson>(`/t/${encodeURIComponent(topicId)}.json`, options);
    if (topic.title) titleCache.set(topicId, normalizeText(topic.title));
    return topic;
}

export async function fetchAllPosts(topicId: string, options?: DiscourseRequestOptions): Promise<{ title: string; posts: TopicPost[] }> {
    const topic = await fetchTopic(topicId, options);
    const loaded = new Map(topic.post_stream.posts.map(post => [post.id, post]));
    const missing = (topic.post_stream.stream ?? []).filter(id => !loaded.has(id));
    for (let index = 0; index < missing.length; index += CHUNK) {
        const ids = missing.slice(index, index + CHUNK);
        const query = ids.map(id => `post_ids[]=${id}`).join("&");
        const chunk = await discourseJson<{ post_stream: { posts: TopicPost[] } }>(`/t/${encodeURIComponent(topicId)}/posts.json?${query}&include_suggested=false`, options);
        for (const post of chunk.post_stream?.posts ?? []) loaded.set(post.id, post);
    }
    const order = topic.post_stream.stream ?? Array.from(loaded.keys());
    const posts = order.map(id => loaded.get(id)).filter((post): post is TopicPost => Boolean(post));
    return { title: normalizeText(topic.title), posts };
}

export function rememberTopicTitle(topicId: string, title: string) {
    const text = normalizeText(title);
    if (text) titleCache.set(topicId, text);
}

export function cachedTopicTitle(topicId: string): string {
    return titleCache.get(topicId) ?? "";
}

export function resolveTopicTitle(topicId: string): Promise<string> {
    const cached = titleCache.get(topicId);
    if (cached) return Promise.resolve(cached);
    let request = titleRequests.get(topicId);
    if (!request) {
        request = fetchTopic(topicId, { retries: 0 }).then(topic => normalizeText(topic.title), () => "").finally(() => titleRequests.delete(topicId));
        titleRequests.set(topicId, request);
    }
    return request;
}
