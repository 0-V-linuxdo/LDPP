/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { subscribe } from "@api/Events";
import { httpRequest } from "@api/Http";
import { definePluginSettings } from "@api/Settings";
import { PaletteIcon } from "@components/icons";
import { mark } from "@utils/dom";
import { Logger } from "@utils/Logger";
import { randomId } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";

import { compileUserCss, cssFor, extractSections, hasUserCssMeta, isPathDependent, parseUserCss, type StyleSection, type UserCssVar } from "./usercss";

const logger = new Logger("UserStyles");

/** An installed userstyle: the source as written (UserCSS or plain CSS), the chosen variable values, and its compiled sections. */
export interface UserStyle {
    id: string;
    name: string;
    enabled: boolean;
    /** `online` styles were installed from a URL and are re-checked daily; `local` ones were imported or written here. */
    origin: "local" | "online";
    url?: string;
    namespace?: string;
    version?: string;
    description?: string;
    author?: string;
    homepage?: string;
    source: string;
    preprocessor: string;
    vars: Record<string, UserCssVar>;
    sections: StyleSection[];
    installedAt: number;
    updatedAt: number;
    checkedAt?: number;
}

export const settings = definePluginSettings({
    styles: { type: OptionType.CUSTOM, default: [] as UserStyle[] },
    quickCss: { type: OptionType.CUSTOM, default: "" },
    quickCssEnabled: { type: OptionType.CUSTOM, default: true },
});

export function listStyles(): UserStyle[] {
    const raw = settings.store.styles;
    return Array.isArray(raw) ? raw as UserStyle[] : [];
}

/** A detached deep copy: values read from the settings store are proxies, which structuredClone rejects. */
export const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function saveStyles(next: UserStyle[]) {
    settings.store.styles = plain(next);
    applyAll();
}

export function getStyle(id: string): UserStyle | undefined {
    return listStyles().find(style => style.id === id);
}

export function updateStyle(id: string, patch: Partial<UserStyle>) {
    saveStyles(listStyles().map(style => style.id === id ? { ...style, ...patch } : style));
}

export function removeStyle(id: string) {
    saveStyles(listStyles().filter(style => style.id !== id));
}

/** Keeps the user's variable choices across a reinstall/update when the variable still exists with that option. */
function carryValues(next: Record<string, UserCssVar>, previous: Record<string, UserCssVar> | undefined): Record<string, UserCssVar> {
    if (!previous) return next;
    return Object.fromEntries(Object.entries(next).map(([name, variable]) => {
        const old = previous[name];
        const keep = old && old.type === variable.type && old.value != null && (!variable.options || variable.options.some(option => option.name === String(old.value)));
        return [name, keep ? { ...variable, value: old.value } : variable];
    }));
}

export interface BuildInput {
    source: string;
    /** Name for plain CSS without metadata. */
    name?: string;
    previous?: UserStyle;
    origin?: UserStyle["origin"];
    url?: string;
    enabled?: boolean;
    /** Variable values to start from (a Stylus backup stores the user's choices next to the source). */
    vars?: Record<string, UserCssVar>;
    author?: string;
    description?: string;
}

/** Parses and compiles a source into a style record. Throws a readable error for malformed metadata or an unsupported preprocessor. */
export function buildStyle(input: BuildInput): UserStyle {
    const now = Date.now();
    const base = {
        id: input.previous?.id ?? randomId("style-"),
        enabled: input.enabled ?? input.previous?.enabled ?? true,
        origin: input.origin ?? input.previous?.origin ?? "local",
        url: input.url ?? input.previous?.url,
        installedAt: input.previous?.installedAt ?? now,
        updatedAt: now,
        checkedAt: input.origin === "online" || input.previous?.origin === "online" ? now : undefined,
        source: input.source,
    };
    if (!hasUserCssMeta(input.source)) {
        return { ...base, name: input.name?.trim() || input.previous?.name || "未命名样式", author: input.author, description: input.description, preprocessor: "default", vars: {}, sections: extractSections(input.source) };
    }
    const meta = parseUserCss(input.source);
    meta.vars = carryValues(input.vars ? carryValues(meta.vars, input.vars) : meta.vars, input.previous?.vars);
    return {
        ...base,
        name: meta.name,
        namespace: meta.namespace,
        version: meta.version,
        description: meta.description ?? input.description,
        author: meta.author ?? input.author,
        homepage: meta.homepageURL,
        url: base.url ?? meta.updateURL,
        preprocessor: meta.preprocessor,
        vars: meta.vars,
        sections: compileUserCss(input.source, meta),
    };
}

/** Rebuilds a style's sections after its variables changed. */
export function recompile(style: UserStyle, vars: Record<string, UserCssVar>): UserStyle {
    if (!hasUserCssMeta(style.source)) return { ...style, vars };
    const meta = parseUserCss(style.source);
    meta.vars = carryValues(meta.vars, vars);
    return { ...style, vars: meta.vars, sections: compileUserCss(style.source, meta), updatedAt: Date.now() };
}

/** The style a new install replaces: same UserCSS name + namespace, or the same install URL. */
export function findExisting(style: UserStyle, list = listStyles()): UserStyle | undefined {
    return list.find(item => item.id !== style.id && ((style.url && item.url === style.url) || (style.namespace && item.namespace === style.namespace && item.name === style.name)));
}

/** Adds a style, replacing an earlier install of the same style (keeping its variable choices and on/off state). */
export function installStyle(style: UserStyle): "added" | "updated" {
    const list = listStyles();
    const existing = findExisting(style, list);
    if (!existing) {
        saveStyles([...list, style]);
        return "added";
    }
    const kept = { ...style, id: existing.id, enabled: existing.enabled, installedAt: existing.installedAt };
    const merged = hasUserCssMeta(style.source) && Object.keys(existing.vars).length ? recompile(kept, existing.vars) : kept;
    saveStyles(list.map(item => item.id === existing.id ? merged : item));
    return "updated";
}

export async function fetchStyleSource(url: string): Promise<string> {
    const response = await httpRequest({ url, timeout: 30_000 });
    if (!response.ok) throw new Error(`下载失败（HTTP ${response.status}）`);
    const text = response.text;
    if (/^\s*</.test(text) && !hasUserCssMeta(text)) throw new Error("这个网址返回的是网页，不是样式文件（.user.css）");
    return text;
}

const DAY = 24 * 60 * 60 * 1000;

/** Re-downloads online styles once a day; a changed source is rebuilt with the user's variable choices kept. */
async function checkUpdates() {
    for (const style of listStyles()) {
        if (style.origin !== "online" || !style.url || Date.now() - (style.checkedAt ?? 0) < DAY) continue;
        try {
            const source = await fetchStyleSource(style.url);
            const current = getStyle(style.id);
            if (!current) continue;
            if (source === current.source) updateStyle(current.id, { checkedAt: Date.now() });
            else installStyle(buildStyle({ source, previous: current }));
        } catch (error) {
            logger.warn(`更新样式「${style.name}」失败`, error);
            updateStyle(style.id, { checkedAt: Date.now() });
        }
    }
}

// Userstyles go after the page's own stylesheets, as Stylus places them, so equal-specificity rules win; quick CSS last.
const QUICK = "quick-css";
let host: HTMLElement | null = null;
const elements = new Map<string, HTMLStyleElement>();

function container(): HTMLElement {
    if (!host) host = mark(document.createElement("ldpp-user-styles"), "user-styles");
    const root = document.documentElement;
    if (host.parentNode !== root || root.lastElementChild !== host) root.appendChild(host);
    return host;
}

function put(key: string, css: string) {
    let el = elements.get(key);
    if (!css) {
        el?.remove();
        elements.delete(key);
        return;
    }
    if (!el) {
        el = document.createElement("style");
        el.dataset.ldppUserStyle = key;
        elements.set(key, el);
    }
    if (el.textContent !== css) el.textContent = css;
    const box = container();
    if (el.parentNode !== box) box.appendChild(el);
}

export function applyAll() {
    const href = location.href;
    const wanted = new Set<string>();
    for (const style of listStyles()) {
        if (!style.enabled) continue;
        wanted.add(style.id);
        put(style.id, cssFor(style.sections, href));
    }
    for (const key of elements.keys()) if (key !== QUICK && !wanted.has(key)) put(key, "");
    put(QUICK, settings.store.quickCssEnabled !== false ? String(settings.store.quickCss ?? "") : "");
    // Quick CSS stays after every userstyle, including ones enabled after it.
    const quick = elements.get(QUICK);
    if (quick && quick.nextSibling) container().appendChild(quick);
}

export function setQuickCss(css: string) {
    settings.store.quickCss = css;
    applyAll();
}

export function setQuickCssEnabled(enabled: boolean) {
    settings.store.quickCssEnabled = enabled;
    applyAll();
}

export default definePlugin({
    name: "UserStyles",
    displayName: "主题与快速 CSS",
    description: "安装 Stylus 样式（UserCSS）与快速 CSS，作用于 linux.do。",
    tags: ["core"],
    icon: PaletteIcon,
    required: true,
    hidden: true,
    startAt: StartAt.Init,
    settings,
    start() {
        applyAll();
        // Stylus re-appends its styles after the page finishes building <head>/<body>; do the same.
        document.addEventListener("DOMContentLoaded", () => container(), { once: true });
        window.addEventListener("load", () => container(), { once: true });
        subscribe("navigate", () => {
            if (listStyles().some(style => style.enabled && style.sections.some(isPathDependent))) applyAll();
        });
        setTimeout(() => void checkUpdates(), 10_000);
    },
});
