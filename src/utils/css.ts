/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const registry = new Map<string, string>();
const active = new Map<string, HTMLStyleElement>();
let root: HTMLElement | null = null;

function container(): HTMLElement | null {
    if (root?.isConnected) return root;
    const host = document.head ?? document.documentElement;
    if (!host) return null;
    root = document.createElement("ldpp-styles");
    root.dataset.ldpp = "styles";
    host.appendChild(root);
    for (const [name, el] of active) {
        if (el.isConnected) continue;
        const fresh = createStyle(name, registry.get(name) ?? "");
        fresh.disabled = el.disabled;
        root.appendChild(fresh);
        active.set(name, fresh);
    }
    return root;
}

function createStyle(name: string, css: string): HTMLStyleElement {
    const el = document.createElement("style");
    el.dataset.ldppStyle = name;
    el.textContent = css;
    return el;
}

export function registerStyle(name: string, css: string) {
    registry.set(name, css);
    const existing = active.get(name);
    if (existing) {
        if (existing.textContent !== css) existing.textContent = css;
        existing.disabled = false;
        container();
        return;
    }
    const host = container();
    const el = createStyle(name, css);
    active.set(name, el);
    host?.appendChild(el);
}

export function enableStyle(name: string): boolean {
    const el = active.get(name);
    if (el) {
        el.disabled = false;
        return true;
    }
    const css = registry.get(name);
    if (css == null) return false;
    registerStyle(name, css);
    return true;
}

export function disableStyle(name: string): boolean {
    const el = active.get(name);
    if (!el) return false;
    el.disabled = true;
    return true;
}

export function unregisterStyle(name: string) {
    active.get(name)?.remove();
    active.delete(name);
    registry.delete(name);
}

export type ClassArg = string | false | null | undefined | Record<string, unknown>;

export function classNameFactory(prefix: string) {
    return (...args: ClassArg[]) => {
        const names: string[] = [];
        for (const arg of args) {
            if (!arg) continue;
            if (typeof arg === "string") names.push(prefix + arg);
            else for (const [name, on] of Object.entries(arg)) if (on) names.push(prefix + name);
        }
        return names.join(" ");
    };
}

export function classes(...names: Array<string | false | null | undefined>): string {
    return names.filter(Boolean).join(" ");
}
