/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { LDPPEventMap } from "@api/Events";

export default function definePlugin<P extends PluginDef>(plugin: P & Record<PropertyKey, any>) {
    return plugin as typeof plugin & Plugin;
}

export const enum StartAt {
    Init = "Init",
    DOMContentLoaded = "DOMContentLoaded",
}

export const enum OptionType {
    STRING,
    NUMBER,
    BOOLEAN,
    SELECT,
    SLIDER,
    COMPONENT,
    CUSTOM,
}

export type PluginTag = "topics" | "reading" | "ai" | "search" | "sync" | "core";

export interface SelectOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

interface SettingCommon {
    description: string;
    /** Consecutive settings with the same group are shown as sub-tabs (label = group, tab = `tab ?? description`). */
    group?: string;
    tab?: string;
    hidden?: boolean;
    restartNeeded?: boolean;
    onChange?(value: unknown): void;
}

export interface StringSetting extends SettingCommon {
    type: OptionType.STRING;
    default?: string;
    multiline?: boolean;
    placeholder?: string;
    secret?: boolean;
    isValid?(value: string): true | string;
}

export interface NumberSetting extends SettingCommon {
    type: OptionType.NUMBER;
    default?: number;
    min?: number;
    max?: number;
    unit?: string;
}

export interface BooleanSetting extends SettingCommon {
    type: OptionType.BOOLEAN;
    default?: boolean;
}

export interface SelectSetting extends SettingCommon {
    type: OptionType.SELECT;
    options: readonly SelectOption[] | (() => readonly SelectOption[]);
    default?: string | number | boolean;
}

export interface SliderSetting extends SettingCommon {
    type: OptionType.SLIDER;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    default: number;
}

export interface ComponentSetting extends SettingCommon {
    type: OptionType.COMPONENT;
    render(): HTMLElement;
    default?: undefined;
}

export interface CustomSetting<T = unknown> extends Omit<SettingCommon, "description"> {
    type: OptionType.CUSTOM;
    default?: T;
    description?: string;
}

export type SettingDef = StringSetting | NumberSetting | BooleanSetting | SelectSetting | SliderSetting | ComponentSetting | CustomSetting;

export type SettingsDefinition = Record<string, SettingDef>;

type ValueOf<D extends SettingDef> =
    D extends StringSetting ? string
        : D extends NumberSetting | SliderSetting ? number
            : D extends BooleanSetting ? boolean
                : D extends SelectSetting ? string | number | boolean
                    : D extends CustomSetting<infer T> ? T
                        : undefined;

export type SettingsValues<D extends SettingsDefinition> = { [K in keyof D]: ValueOf<D[K]> };

export interface DefinedSettings<D extends SettingsDefinition = SettingsDefinition> {
    readonly store: SettingsValues<D>;
    readonly def: D;
    pluginName: string;
    reset(key: keyof D & string): void;
}

export interface PluginDef {
    name: string;
    displayName: string;
    description: string;
    tags?: PluginTag[];
    icon?: (size?: number) => SVGElement;
    required?: boolean;
    hidden?: boolean;
    enabledByDefault?: boolean;
    dependencies?: string[];
    startAt?: StartAt;
    settings?: DefinedSettings<any>;
    managedStyle?: string;
    start?(): void;
    stop?(): void;
    onSettingsChange?(path: string): void;
    events?: { [K in keyof LDPPEventMap]?: (data: LDPPEventMap[K]) => void };
}

export interface Plugin extends PluginDef {
    started: boolean;
    /** When the plugin's folder last changed (ms), stamped by the build from git; drives the 「最新」 tab. */
    updatedAt?: number;
}
