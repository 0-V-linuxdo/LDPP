/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "./Logger";

const logger = new Logger("GM");
const LS_PREFIX = "ldpp-gm:";

const hasGM = (name: string) => typeof (globalThis as Record<string, unknown>)[name] === "function";

export function gmGet<T>(key: string, fallback: T): T {
    try {
        if (hasGM("GM_getValue")) return GM_getValue<T>(key, fallback) ?? fallback;
        const raw = localStorage.getItem(LS_PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw) as T;
    } catch (error) {
        logger.warn(`读取 ${key} 失败`, error);
        return fallback;
    }
}

export function gmSet(key: string, value: unknown) {
    try {
        if (hasGM("GM_setValue")) GM_setValue(key, value);
        else localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
    } catch (error) {
        logger.error(`写入 ${key} 失败`, error);
    }
}

export function gmDelete(key: string) {
    try {
        if (hasGM("GM_deleteValue")) GM_deleteValue(key);
        else localStorage.removeItem(LS_PREFIX + key);
    } catch (error) {
        logger.warn(`删除 ${key} 失败`, error);
    }
}

export function gmOnRemoteChange(key: string, onChange: (value: unknown) => void) {
    if (!hasGM("GM_addValueChangeListener")) return;
    GM_addValueChangeListener(key, (_name, _old, value, remote) => {
        if (remote) onChange(value);
    });
}

export function gmMenu(name: string, fn: () => void) {
    if (hasGM("GM_registerMenuCommand")) GM_registerMenuCommand(name, fn);
}
