/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isObject } from "./guards";
import { Logger } from "./Logger";

const logger = new Logger("SettingsStore");
const SAVE_DEBOUNCE_MS = 150;

export type SettingsListener = (path: string) => void;
type DefaultGetter = (key: string) => unknown;

export class SettingsStore<T extends object> {
    readonly plain: T;
    readonly store: T;
    private readonly listeners = new Map<string, Set<SettingsListener>>();
    private readonly defaults = new Map<string, DefaultGetter>();
    private readonly proxies = new WeakMap<object, unknown>();
    private saveTimer: ReturnType<typeof setTimeout> | null = null;
    private ready = false;

    constructor(plain: T, private readonly persist: (plain: T) => void) {
        this.plain = plain;
        this.store = this.wrap(plain as Record<string, unknown>, "") as T;
    }

    markReady() {
        this.ready = true;
    }

    setDefaults(prefix: string, getter: DefaultGetter) {
        this.defaults.set(prefix, getter);
    }

    defaultFor(path: string): unknown {
        const dot = path.lastIndexOf(".");
        return dot < 0 ? undefined : this.defaults.get(path.slice(0, dot))?.(path.slice(dot + 1));
    }

    subscribe(prefix: string, listener: SettingsListener): () => void {
        let set = this.listeners.get(prefix);
        if (!set) this.listeners.set(prefix, set = new Set());
        set.add(listener);
        return () => {
            set.delete(listener);
            if (!set.size) this.listeners.delete(prefix);
        };
    }

    replaceAll(next: T, notify = true) {
        for (const key of Object.keys(this.plain)) delete (this.plain as Record<string, unknown>)[key];
        Object.assign(this.plain, next);
        if (notify) this.notify("");
    }

    flush() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = null;
        if (this.ready) this.persist(this.plain);
    }

    notify(path: string) {
        for (const [prefix, set] of Array.from(this.listeners)) {
            if (!(path.startsWith(prefix) || prefix.startsWith(path))) continue;
            for (const listener of Array.from(set)) {
                try { listener(path); } catch (error) { logger.error("设置监听器出错", error); }
            }
        }
        if (!this.ready || this.saveTimer) return;
        this.saveTimer = setTimeout(() => this.flush(), SAVE_DEBOUNCE_MS);
    }

    private wrap(target: Record<string, unknown>, path: string): unknown {
        const cached = this.proxies.get(target);
        if (cached) return cached;
        const proxy = new Proxy(target, {
            get: (t, key) => {
                if (typeof key !== "string") return Reflect.get(t, key);
                const full = path ? `${path}.${key}` : key;
                let value = t[key];
                if (value === undefined) value = this.defaultFor(full);
                return isObject(value) || Array.isArray(value) ? this.wrap(value as Record<string, unknown>, full) : value;
            },
            set: (t, key, value) => {
                if (typeof key !== "string") return Reflect.set(t, key, value);
                if (Object.is(t[key], value)) return true;
                t[key] = value;
                this.notify(path ? `${path}.${key}` : key);
                return true;
            },
            deleteProperty: (t, key) => {
                if (typeof key !== "string" || !(key in t)) return true;
                delete t[key];
                this.notify(path ? `${path}.${key}` : key);
                return true;
            },
        });
        this.proxies.set(target, proxy);
        return proxy;
    }
}
