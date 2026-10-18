/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

declare const IS_DEV: boolean;
declare const VERSION: string;
declare const GIT_HASH: string;

declare const unsafeWindow: typeof globalThis | undefined;

interface GMRequestResponse {
    status: number;
    statusText: string;
    responseText: string;
    response: unknown;
    responseHeaders: string;
    finalUrl: string;
}

interface GMRequestOptions {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    data?: string | Blob | ArrayBuffer | FormData;
    responseType?: "text" | "json" | "arraybuffer" | "blob";
    timeout?: number;
    anonymous?: boolean;
    onload?(response: GMRequestResponse): void;
    onerror?(error: unknown): void;
    ontimeout?(): void;
    onabort?(): void;
}

declare function GM_getValue<T = unknown>(key: string, defaultValue?: T): T;
declare function GM_setValue(key: string, value: unknown): void;
declare function GM_deleteValue(key: string): void;
declare function GM_xmlhttpRequest(options: GMRequestOptions): { abort(): void } | undefined;
declare function GM_registerMenuCommand(name: string, fn: () => void): unknown;
declare function GM_addValueChangeListener(name: string, cb: (name: string, oldValue: unknown, newValue: unknown, remote: boolean) => void): number;
declare function GM_setClipboard(text: string): void;

declare module "*.css" {}

declare module "~plugins" {
    const plugins: Record<string, import("./utils/types").Plugin>;
    export default plugins;
}

/** usercss-meta (Stylus's UserCSS metadata parser) ships without types. */
declare module "usercss-meta" {
    export function parse(text: string, options?: { mandatoryKeys?: string[]; allowErrors?: boolean; unknownKey?: "ignore" | "assign" | "throw" }): { metadata: Record<string, unknown>; errors: unknown[] };
}
