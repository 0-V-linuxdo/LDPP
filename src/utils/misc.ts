/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export const pageWindow: typeof globalThis = typeof unsafeWindow !== "undefined" && unsafeWindow ? unsafeWindow : globalThis;

export function sleep(ms: number, signal?: AbortSignal | null): Promise<void> {
    return new Promise((resolve, reject) => {
        if (signal?.aborted) return reject(abortError());
        const timer = setTimeout(() => {
            signal?.removeEventListener("abort", onAbort);
            resolve();
        }, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(abortError());
        };
        signal?.addEventListener("abort", onAbort, { once: true });
    });
}

export function abortError(message = "已取消"): Error {
    const error = new Error(message);
    error.name = "AbortError";
    return error;
}

export function isAbortError(error: unknown): boolean {
    return (error as { name?: string } | null)?.name === "AbortError";
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const run = (...args: A) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, ms);
    };
    run.cancel = () => {
        if (timer) clearTimeout(timer);
        timer = null;
    };
    return run;
}

export function onlyOnce<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R | undefined {
    let done = false;
    return (...args: A) => {
        if (done) return undefined;
        done = true;
        return fn(...args);
    };
}

export function randomId(prefix = ""): string {
    return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

export function errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message || error.name;
    if (typeof error === "string") return error;
    try { return JSON.stringify(error); } catch { return String(error); }
}

export function mapGetOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
    let value = map.get(key);
    if (value === undefined) {
        value = create();
        map.set(key, value);
    }
    return value;
}

const pad2 = (value: number) => String(value).padStart(2, "0");

export function todayStamp(date = new Date()): string {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function downloadJson(data: unknown, fileName: string) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Opens the file chooser. The input stays in the document while the chooser is open (Safari drops detached ones). */
export function pickFiles(accept: string, multiple = false): Promise<File[]> {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.multiple = multiple;
        input.hidden = true;
        input.setAttribute("data-ldpp", "file-picker");
        input.addEventListener("cancel", () => {
            input.remove();
            reject(abortError("未选择文件"));
        }, { once: true });
        input.addEventListener("change", () => {
            input.remove();
            const files = [...input.files ?? []];
            if (files.length) resolve(files);
            else reject(abortError("未选择文件"));
        }, { once: true });
        document.body.append(input);
        input.click();
    });
}

export async function pickJsonFile(): Promise<unknown> {
    const [file] = await pickFiles(".json,application/json");
    const text = await file.text();
    try {
        return JSON.parse(text);
    } catch {
        throw new Error("文件不是有效的 JSON");
    }
}

export async function copyText(text: string): Promise<void> {
    if (typeof GM_setClipboard === "function") {
        GM_setClipboard(text);
        return;
    }
    await navigator.clipboard.writeText(text);
}
