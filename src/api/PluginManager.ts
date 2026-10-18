/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { disableStyle, enableStyle } from "@utils/css";
import { Logger } from "@utils/Logger";
import { type Plugin, StartAt } from "@utils/types";

import { dispatch, type LDPPEvent, subscribe } from "./Events";
import { mergePluginSettings, onSettingsChange, PlainSettings, pluginPath } from "./Settings";

const logger = new Logger("PluginManager", "#b4befe");

export const plugins: Record<string, Plugin> = {};
const cleanups = new Map<string, Array<() => void>>();

export function registerPlugin(plugin: Plugin) {
    if (plugins[plugin.name]) return;
    plugin.started = false;
    plugins[plugin.name] = plugin;
    if (plugin.settings) plugin.settings.pluginName = plugin.name;
}

export function isPluginEnabled(name: string): boolean {
    const plugin = plugins[name];
    if (!plugin) return false;
    if (plugin.required) return true;
    return PlainSettings.plugins[name]?.enabled ?? plugin.enabledByDefault ?? false;
}

function runCleanups(name: string) {
    for (const fn of cleanups.get(name) ?? []) {
        try { fn(); } catch (error) { logger.error(`${name} 清理出错`, error); }
    }
    cleanups.delete(name);
}

export function startPlugin(plugin: Plugin): boolean {
    if (plugin.started) return true;
    for (const dep of plugin.dependencies ?? []) {
        const target = plugins[dep];
        if (!target) {
            logger.error(`${plugin.name} 缺少依赖 ${dep}`);
            return false;
        }
        if (!isPluginEnabled(dep)) mergePluginSettings(dep, { enabled: true });
        if (!startPlugin(target)) return false;
    }
    const unsubs: Array<() => void> = [];
    cleanups.set(plugin.name, unsubs);
    try {
        if (plugin.managedStyle) enableStyle(plugin.managedStyle);
        plugin.start?.();
        for (const [event, handler] of Object.entries(plugin.events ?? {})) {
            if (handler) unsubs.push(subscribe(event as LDPPEvent, handler as (data: unknown) => void));
        }
        if (plugin.onSettingsChange) {
            const handler = plugin.onSettingsChange.bind(plugin);
            unsubs.push(onSettingsChange(pluginPath(plugin.name), handler));
        }
        plugin.started = true;
        if (!plugin.hidden) logger.info(`已启动 ${plugin.name}`);
        return true;
    } catch (error) {
        logger.error(`启动 ${plugin.name} 失败`, error);
        runCleanups(plugin.name);
        if (plugin.managedStyle) disableStyle(plugin.managedStyle);
        return false;
    }
}

export function stopPlugin(plugin: Plugin): boolean {
    if (!plugin.started || plugin.required) return !plugin.started;
    for (const other of Object.values(plugins)) {
        if (other.started && other.dependencies?.includes(plugin.name)) stopPlugin(other);
    }
    try { plugin.stop?.(); } catch (error) { logger.error(`停止 ${plugin.name} 出错`, error); }
    runCleanups(plugin.name);
    if (plugin.managedStyle) disableStyle(plugin.managedStyle);
    plugin.started = false;
    return true;
}

function requirementsOf(name: string, out = new Set<string>()): Set<string> {
    for (const dep of plugins[name]?.dependencies ?? []) {
        if (out.has(dep)) continue;
        out.add(dep);
        requirementsOf(dep, out);
    }
    return out;
}

function dependentsOf(name: string, out = new Set<string>()): Set<string> {
    for (const other of Object.values(plugins)) {
        if (out.has(other.name) || !other.dependencies?.includes(name)) continue;
        out.add(other.name);
        dependentsOf(other.name, out);
    }
    return out;
}

export function setPluginEnabled(name: string, enabled: boolean) {
    const plugin = plugins[name];
    if (!plugin || plugin.required) return;
    const related = enabled ? requirementsOf(name) : dependentsOf(name);
    const changed = [...related].filter(other => !plugins[other].required && isPluginEnabled(other) !== enabled);
    for (const other of [...changed, name]) mergePluginSettings(other, { enabled });
    if (enabled) startPlugin(plugin);
    else stopPlugin(plugin);
    for (const other of [...changed, name]) dispatch("pluginToggle", { name: other, enabled });
}

export function startAllPlugins(target: StartAt) {
    for (const plugin of Object.values(plugins)) {
        if ((plugin.startAt ?? StartAt.DOMContentLoaded) !== target || !isPluginEnabled(plugin.name)) continue;
        startPlugin(plugin);
    }
}
