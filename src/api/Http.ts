/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { abortError } from "@utils/misc";

export interface HttpRequest {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    body?: string | Blob;
    responseType?: "text" | "arraybuffer";
    timeout?: number;
    signal?: AbortSignal | null;
    credentials?: "include" | "omit";
}

export interface HttpResponse {
    status: number;
    ok: boolean;
    text: string;
    buffer: ArrayBuffer | null;
    contentType: string;
}

const DEFAULT_TIMEOUT = 120_000;
const CONTENT_TYPE = /^content-type:\s*([^\r\n]+)/im;

export function gmErrorReason(error: unknown): string {
    const info = typeof error === "object" && error ? error as Record<string, unknown> : {};
    const parts: string[] = [];
    const text = typeof info.error === "string" ? info.error.trim() : typeof error === "string" ? error.trim() : "";
    if (text) parts.push(text);
    const status = typeof info.status === "number" ? info.status : 0;
    const statusText = typeof info.statusText === "string" ? info.statusText.trim() : "";
    if (status > 0) parts.push(`HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
    else if (statusText && !parts.includes(statusText)) parts.push(statusText);
    return parts.length ? parts.join("，") : "无法建立连接（可能是 DNS 解析失败、证书无效、代理拦截或服务器拒绝连接）";
}

function fetchErrorReason(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof TypeError) return `${message}（可能是跨域 CORS 被拦截、DNS 解析失败或服务器拒绝连接）`;
    return message;
}

const hasGMRequest = () => typeof (globalThis as Record<string, unknown>).GM_xmlhttpRequest === "function";

function viaGM(req: HttpRequest): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
        if (req.signal?.aborted) return reject(abortError());
        const timeout = req.timeout ?? DEFAULT_TIMEOUT;
        const handle = GM_xmlhttpRequest({
            method: req.method ?? "GET",
            url: req.url,
            headers: req.headers,
            data: req.body,
            responseType: req.responseType === "arraybuffer" ? "arraybuffer" : "text",
            timeout,
            anonymous: req.credentials === "omit",
            onload: res => {
                req.signal?.removeEventListener("abort", onAbort);
                const isBuffer = req.responseType === "arraybuffer";
                resolve({
                    status: res.status,
                    ok: res.status >= 200 && res.status < 300,
                    text: isBuffer ? "" : res.responseText ?? "",
                    buffer: isBuffer ? res.response as ArrayBuffer : null,
                    contentType: res.responseHeaders?.match(CONTENT_TYPE)?.[1]?.trim() ?? "",
                });
            },
            onerror: error => {
                req.signal?.removeEventListener("abort", onAbort);
                reject(new Error(`网络请求失败：${gmErrorReason(error)}（${req.url}）`));
            },
            ontimeout: () => {
                req.signal?.removeEventListener("abort", onAbort);
                reject(new Error(`请求超时：${Math.round(timeout / 1000)} 秒内没有响应（${req.url}）`));
            },
            onabort: () => reject(abortError()),
        });
        const onAbort = () => handle?.abort();
        req.signal?.addEventListener("abort", onAbort, { once: true });
    });
}

async function viaFetch(req: HttpRequest): Promise<HttpResponse> {
    const controller = new AbortController();
    const timeout = req.timeout ?? DEFAULT_TIMEOUT;
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeout);
    const relay = () => controller.abort();
    req.signal?.addEventListener("abort", relay, { once: true });
    try {
        const res = await fetch(req.url, {
            method: req.method ?? "GET",
            headers: req.headers,
            body: req.body,
            credentials: req.credentials ?? "omit",
            signal: controller.signal,
        });
        const isBuffer = req.responseType === "arraybuffer";
        return {
            status: res.status,
            ok: res.ok,
            text: isBuffer ? "" : await res.text(),
            buffer: isBuffer ? await res.arrayBuffer() : null,
            contentType: res.headers.get("content-type") ?? "",
        };
    } catch (error) {
        if (req.signal?.aborted) throw abortError();
        if (timedOut) throw new Error(`请求超时：${Math.round(timeout / 1000)} 秒内没有响应（${req.url}）`, { cause: error });
        throw new Error(`网络请求失败：${fetchErrorReason(error)}（${req.url}）`, { cause: error });
    } finally {
        clearTimeout(timer);
        req.signal?.removeEventListener("abort", relay);
    }
}

export function httpRequest(req: HttpRequest): Promise<HttpResponse> {
    return hasGMRequest() ? viaGM(req) : viaFetch(req);
}

export function sameOriginFetch(url: string, init: RequestInit = {}): Promise<Response> {
    return fetch(url, { credentials: "include", ...init });
}
