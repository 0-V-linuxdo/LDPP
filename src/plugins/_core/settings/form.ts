/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { resolveDefault } from "@api/Settings";
import { Field, NumberInput, Select, StackField, SubTabs, Switch, TextInput } from "@components/controls";
import { h } from "@utils/dom";
import { OptionType, type Plugin, type SettingDef, type SliderSetting } from "@utils/types";

function Slider(def: SliderSetting, value: number, onChange: (value: number) => void): HTMLElement {
    const output = h("output", { class: "ldpp-slider-value" }, `${value}${def.unit ?? ""}`);
    const input = h("input", { type: "range", class: "ldpp-slider", min: String(def.min), max: String(def.max), step: String(def.step ?? 1), value: String(value) });
    input.addEventListener("input", () => { output.textContent = `${input.value}${def.unit ?? ""}`; });
    input.addEventListener("change", () => onChange(Number(input.value)));
    return h("span", { class: "ldpp-slider-wrap" }, input, output);
}

function control(key: string, def: SettingDef, store: Record<string, unknown>): HTMLElement | null {
    const value = store[key] ?? resolveDefault(def);
    const set = (next: unknown) => {
        store[key] = next;
        def.onChange?.(next);
    };
    switch (def.type) {
        case OptionType.BOOLEAN:
            return Field(def.description, Switch(Boolean(value), set, def.description));
        case OptionType.STRING: {
            const input = TextInput({ value: String(value ?? ""), multiline: def.multiline, secret: def.secret, placeholder: def.placeholder, monospace: def.multiline });
            const error = h("p", { class: "ldpp-field-error" });
            const field = input.querySelector<HTMLInputElement>("input") ?? input as HTMLInputElement;
            field.addEventListener("change", () => {
                const verdict = def.isValid?.(field.value) ?? true;
                error.textContent = verdict === true ? "" : verdict;
                field.classList.toggle("is-invalid", verdict !== true);
                if (verdict === true) set(field.value);
            });
            return def.multiline ? StackField(def.description, [input, error]) : Field(def.description, h("span", { class: "ldpp-field-control ldpp-field-wide" }, input, error));
        }
        case OptionType.NUMBER:
            return Field(def.description, NumberInput({ value: Number(value ?? 0), min: def.min, max: def.max, unit: def.unit, onChange: set }));
        case OptionType.SLIDER:
            return Field(def.description, Slider(def, Number(value ?? def.default), set));
        case OptionType.SELECT: {
            const options = typeof def.options === "function" ? def.options() : def.options;
            return Field(def.description, Select(String(value), options.map(option => ({ label: option.label, value: String(option.value) })), raw => set(options.find(option => String(option.value) === raw)?.value ?? raw)));
        }
        case OptionType.COMPONENT:
            return def.render();
        case OptionType.CUSTOM:
            return null;
    }
}

export function renderSettingsForm(plugin: Plugin, only?: (key: string, def: SettingDef) => boolean): HTMLElement | null {
    const defined = plugin.settings;
    if (!defined) return null;
    const store = defined.store as Record<string, unknown>;
    const entries = Object.entries(defined.def as Record<string, SettingDef>).filter(([key, def]) => !def.hidden && (!only || only(key, def)));
    const fields: HTMLElement[] = [];
    for (let i = 0; i < entries.length; i++) {
        const [key, def] = entries[i];
        if (!def.group) {
            const el = control(key, def, store);
            if (el) fields.push(el);
            continue;
        }
        // Long related texts (two prompts, prefix / suffix lists) share one tabbed block instead of stacking.
        const members: Array<[string, SettingDef]> = [];
        while (i < entries.length && entries[i][1].group === def.group) members.push(entries[i++]);
        i--;
        const tabs = SubTabs(members.map(([memberKey, member]) => ({
            label: () => member.tab ?? member.description ?? "",
            render: () => h("div", { class: "ldpp-settings-group-panel" }, h("p", { class: "ldpp-muted ldpp-settings-group-desc" }, member.description), control(memberKey, { ...member, description: "" }, store)),
        })));
        fields.push(h("div", { class: "ldpp-field ldpp-field-stack ldpp-settings-group" }, h("span", { class: "ldpp-field-label" }, def.group), tabs.el));
    }
    return fields.length ? h("div", { class: "ldpp-settings-form" }, fields) : null;
}
