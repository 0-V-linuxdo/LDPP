/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GlobalWindow } from "happy-dom";

const window = new GlobalWindow({ url: "https://linux.do/latest" });
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "Text", "DOMParser", "MutationObserver", "NodeFilter", "CSS", "location", "localStorage", "navigator", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame", "ResizeObserver", "HTMLTableRowElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLVideoElement", "Event", "KeyboardEvent", "MouseEvent"] as const) {
    (globalThis as Record<string, unknown>)[key] = (window as unknown as Record<string, unknown>)[key];
}
(globalThis as Record<string, unknown>).IS_DEV = false;
(globalThis as Record<string, unknown>).VERSION = "test";
(globalThis as Record<string, unknown>).GIT_HASH = "test";
