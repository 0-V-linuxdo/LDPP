/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { gmGet, gmOnRemoteChange, gmSet } from "@utils/gm";
import { isObject } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { SettingsStore as Store } from "@utils/SettingsStore";
import { type DefinedSettings, OptionType, type SettingDef, type SettingsDefinition, type SettingsValues } from "@utils/types";

const logger = new Logger("Settings");

export const STORAGE_KEY = "LDPPSettings";

export interface SettingsShape {
    plugins: Record<string, Record<string, unknown> & { enabled?: boolean }>;
}

export const PlainSettings: SettingsShape = { plugins: {} };

export const SettingsStore = new Store<SettingsShape>(PlainSettings, plain => gmSet(STORAGE_KEY, plain));

export const Settings = SettingsStore.store;

export const pluginPath = (name: string, key?: string) => key ? `plugins.${name}.${key}` : `plugins.${name}`;

function parseBag(raw: unknown): SettingsShape | null {
    let value = raw;
    if (typeof value === "string") {
        try { value = JSON.parse(value); } catch { return null; }
    }
    if (!isObject(value) || !isObject(value.plugins)) return null;
    return value as unknown as SettingsShape;
}

export function initSettings() {
    const stored = parseBag(gmGet(STORAGE_KEY, null));
    if (stored) SettingsStore.replaceAll({ plugins: stored.plugins }, false);
    SettingsStore.markReady();
    gmOnRemoteChange(STORAGE_KEY, value => {
        const next = parseBag(value);
        if (!next) return;
        logger.info("设置已在其他标签页更新");
        SettingsStore.replaceAll({ plugins: next.plugins });
    });
    window.addEventListener("pagehide", () => SettingsStore.flush());
}

export function resolveDefault(def: SettingDef): unknown {
    if (def.type === OptionType.SELECT && def.default === undefined) {
        const options = typeof def.options === "function" ? def.options() : def.options;
        return options.find(option => option.default)?.value ?? options[0]?.value;
    }
    const value = def.default;
    return value !== null && typeof value === "object" ? structuredClone(value) : value;
}

export function definePluginSettings<D extends SettingsDefinition>(def: D): DefinedSettings<D> {
    let name = "";
    return {
        def,
        get store() {
            if (!name) throw new Error("插件尚未注册，无法读取设置");
            PlainSettings.plugins[name] ??= {};
            return Settings.plugins[name] as unknown as SettingsValues<D>;
        },
        get pluginName() {
            return name;
        },
        set pluginName(value: string) {
            name = value;
            SettingsStore.setDefaults(pluginPath(value), key => key in def ? resolveDefault(def[key]) : undefined);
        },
        reset(key) {
            const bag = Settings.plugins[name];
            if (bag) delete bag[key];
        },
    };
}

export function mergePluginSettings(name: string, patch: Record<string, unknown>) {
    Settings.plugins[name] = { ...PlainSettings.plugins[name], ...patch };
}

export function onSettingsChange(prefix: string, listener: (path: string) => void): () => void {
    return SettingsStore.subscribe(prefix, listener);
}
