/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classes } from "@utils/css";
import { type Child, h, mark, svg } from "@utils/dom";
import { copyText } from "@utils/misc";

import { EyeIcon, EyeOffIcon, InfoIcon } from "./icons";

/** `delete`: looks like a default button, turns into the red danger button on hover — for actions that open a red confirmation. */
export type ButtonKind = "default" | "primary" | "danger" | "delete" | "ghost";

export interface ButtonOptions {
    kind?: ButtonKind;
    icon?: SVGElement;
    title?: string;
    small?: boolean;
    disabled?: boolean;
    onClick?(event: MouseEvent): void;
}

export function Button(label: Child, { kind = "default", icon, title, small, disabled, onClick }: ButtonOptions = {}): HTMLButtonElement {
    return h("button", {
        type: "button",
        class: classes("ldpp-btn", `ldpp-btn-${kind}`, small && "ldpp-btn-small"),
        title: title ?? "",
        disabled: Boolean(disabled),
        on: onClick ? { click: onClick } : undefined,
    }, icon, label != null && label !== "" ? h("span", { class: "ldpp-btn-label" }, label) : null);
}

export interface IconButtonOptions {
    title: string;
    onClick?(event: MouseEvent): void;
    className?: string;
    pressed?: boolean;
}

export function IconButton(icon: SVGElement, { title, onClick, className, pressed }: IconButtonOptions): HTMLButtonElement {
    return h("button", {
        type: "button",
        class: classes("ldpp-icon-btn", className),
        title,
        attrs: { "aria-label": title, "aria-pressed": pressed == null ? null : String(pressed) },
        on: onClick ? { click: onClick } : undefined,
    }, icon);
}

const FEEDBACK_ACTIVE_MS = 2250;
const FEEDBACK_CLEANUP_MS = 2500;
const feedbackTimers = new WeakMap<HTMLElement, number[]>();

export function flashFeedback(button: HTMLElement, ok = true, label?: string) {
    for (const id of feedbackTimers.get(button) ?? []) clearTimeout(id);
    const clearMarks = () => {
        for (const el of Array.from(button.querySelectorAll(":scope > .ldpp-feedback-svg, :scope > .ldpp-feedback-alert"))) el.remove();
    };
    clearMarks();
    if (ok) {
        const check = svg("0 0 52 52", [["path", { d: "M13 26 l10 10 20 -20" }]], 20);
        check.classList.add("ldpp-feedback-svg");
        button.append(check);
    }
    if (label) button.append(h("span", { class: classes("ldpp-feedback-alert", ok ? "is-success" : "is-fail"), attrs: { role: "status" } }, label));
    button.classList.add("is-feedback-active", "is-feedback-transition");
    feedbackTimers.set(button, [
        window.setTimeout(() => button.classList.remove("is-feedback-active"), FEEDBACK_ACTIVE_MS),
        window.setTimeout(() => {
            button.classList.remove("is-feedback-transition");
            clearMarks();
        }, FEEDBACK_CLEANUP_MS),
    ]);
}

export function copyWithFeedback(button: HTMLElement, text: string): Promise<void> {
    return copyText(text).then(() => flashFeedback(button, true, "已复制"), () => flashFeedback(button, false, "复制失败"));
}

export function Switch(checked: boolean, onChange: (value: boolean) => void, label?: string, disabled = false): HTMLLabelElement {
    const input = h("input", { type: "checkbox", checked, disabled, attrs: { role: "switch", "aria-label": label ?? null } });
    input.addEventListener("change", () => onChange(input.checked));
    return h("label", { class: "ldpp-switch" }, input, h("span", { class: "ldpp-switch-track" }));
}

export interface TextOptions {
    value: string;
    placeholder?: string;
    multiline?: boolean;
    rows?: number;
    secret?: boolean;
    monospace?: boolean;
    onChange?(value: string): void;
    onInput?(value: string): void;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
    for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        const overflow = getComputedStyle(node).overflowY;
        if (overflow === "auto" || overflow === "scroll") return node;
    }
    return null;
}

/**
 * Fit a textarea to its content: never shorter than its `rows`, at most `maxHeight` (40% of the window).
 * It never adds a second scrollbar: if the box would scroll *and* push the dialog / panel it sits in into scrolling,
 * the box gives up that overflow (one inner scrollbar); if that would leave it under ~7 lines, it shows everything
 * and only the outer container scrolls.
 */
export function autoGrow(area: HTMLTextAreaElement, maxHeight = () => Math.max(160, Math.round(window.innerHeight * 0.4))): HTMLTextAreaElement {
    const fit = () => {
        if (!area.isConnected) {
            window.removeEventListener("resize", fit);
            return;
        }
        area.style.height = "auto";
        const full = area.scrollHeight + area.offsetHeight - area.clientHeight;
        let height = Math.min(full, maxHeight());
        area.style.height = `${height}px`;
        const outer = scrollParent(area);
        const overflow = outer ? outer.scrollHeight - outer.clientHeight : 0;
        if (overflow > 1 && height < full) {
            const shrunk = height - overflow;
            height = shrunk >= Math.min(full, 160) ? shrunk : full;
            area.style.height = `${height}px`;
        }
        area.style.overflowY = height < full ? "auto" : "hidden";
    };
    area.addEventListener("input", fit);
    window.addEventListener("resize", fit);
    let tries = 0;
    const settle = () => {
        if (area.isConnected) fit();
        else if (tries++ < 60) requestAnimationFrame(settle);
    };
    requestAnimationFrame(settle);
    return area;
}

export function TextInput({ value, placeholder, multiline, rows = 2, secret, monospace, onChange, onInput }: TextOptions): HTMLElement {
    const className = classes("ldpp-input", monospace && "ldpp-mono");
    const input = multiline
        ? h("textarea", { class: className, value, placeholder: placeholder ?? "", rows, spellcheck: false })
        : h("input", { class: className, type: secret ? "password" : "text", value, placeholder: placeholder ?? "", spellcheck: false, autocomplete: "off" });
    if (input instanceof HTMLTextAreaElement) autoGrow(input);
    if (onChange) input.addEventListener("change", () => onChange(input.value));
    if (onInput) input.addEventListener("input", () => onInput(input.value));
    if (!secret || multiline) return input;
    let revealed = false;
    const toggle = h("button", { type: "button", class: "ldpp-secret-toggle", title: "显示/隐藏" }, EyeIcon());
    toggle.addEventListener("click", () => {
        revealed = !revealed;
        (input as HTMLInputElement).type = revealed ? "text" : "password";
        toggle.replaceChildren(revealed ? EyeOffIcon() : EyeIcon());
    });
    return h("div", { class: "ldpp-secret" }, input, toggle);
}

export interface NumberOptions {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    onChange(value: number): void;
}

export function NumberInput({ value, min, max, step, unit, onChange }: NumberOptions): HTMLElement {
    const input = h("input", { class: "ldpp-input ldpp-number", type: "number", value: String(value), min: min == null ? "" : String(min), max: max == null ? "" : String(max), step: String(step ?? 1) });
    input.addEventListener("change", () => {
        let next = Number(input.value);
        if (!Number.isFinite(next)) next = value;
        if (min != null) next = Math.max(min, next);
        if (max != null) next = Math.min(max, next);
        input.value = String(next);
        onChange(next);
    });
    return unit ? h("span", { class: "ldpp-number-wrap" }, input, h("span", { class: "ldpp-unit" }, unit)) : input;
}

export interface SelectChoice {
    label: string;
    value: string;
}

export function Select(value: string, choices: SelectChoice[], onChange: (value: string) => void): HTMLSelectElement {
    const select = h("select", { class: "ldpp-input ldpp-select" }, choices.map(choice => h("option", { value: choice.value, selected: choice.value === value }, choice.label)));
    select.addEventListener("change", () => onChange(select.value));
    return select;
}

export function Field(label: string, control: Child, description?: string): HTMLElement {
    return h("div", { class: "ldpp-field" },
        h("div", { class: "ldpp-field-head" }, h("span", { class: "ldpp-field-label" }, label, description ? InfoTip(description) : null), control),
    );
}

export function StackField(label: string, control: Child, description?: string): HTMLElement {
    return h("div", { class: "ldpp-field ldpp-field-stack" },
        h("span", { class: "ldpp-field-label" }, label, description ? InfoTip(description) : null),
        control,
    );
}

export function Section(title: Child, ...children: Child[]): HTMLElement {
    return h("section", { class: "ldpp-section" }, h("h3", { class: "ldpp-section-title" }, title), ...children);
}

export function Hint(text: Child, kind: "info" | "warning" | "error" | "success" = "info"): HTMLElement {
    return h("p", { class: classes("ldpp-hint", `ldpp-hint-${kind}`) }, text);
}

/**
 * A small ⓘ button that sits inside an existing line (a heading, a label, a button row).
 * Its text opens in a floating popover, so nothing takes vertical space while it is closed.
 */
export function InfoTip(text: Child, { label = "说明", warning = false }: { label?: string; warning?: boolean } = {}): HTMLButtonElement {
    const popover = h("div", { class: "ldpp-infotip-pop", attrs: { role: "tooltip" } }, text);
    const button = h("button", {
        type: "button",
        class: classes("ldpp-infotip", warning && "is-warning"),
        title: label,
        attrs: { "aria-label": label, "aria-expanded": "false" },
    }, InfoIcon(15));
    let cleanup: (() => void) | null = null;
    const close = () => {
        cleanup?.();
        cleanup = null;
        popover.remove();
        button.setAttribute("aria-expanded", "false");
    };
    const place = () => {
        const rect = button.getBoundingClientRect();
        const width = popover.offsetWidth;
        const height = popover.offsetHeight;
        const left = Math.min(Math.max(rect.left, 8), window.innerWidth - width - 8);
        const below = rect.bottom + 6;
        popover.style.left = `${Math.round(left)}px`;
        popover.style.top = `${Math.round(below + height > window.innerHeight - 8 ? Math.max(8, rect.top - 6 - height) : below)}px`;
    };
    const open = () => {
        document.body.appendChild(mark(popover, "infotip"));
        button.setAttribute("aria-expanded", "true");
        place();
        const onPointer = (event: Event) => {
            const target = event.target as Node;
            if (!button.contains(target) && !popover.contains(target)) close();
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            event.stopPropagation();
            close();
        };
        window.addEventListener("mousedown", onPointer, true);
        window.addEventListener("keydown", onKey, true);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        cleanup = () => {
            window.removeEventListener("mousedown", onPointer, true);
            window.removeEventListener("keydown", onKey, true);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    };
    button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (popover.isConnected) close();
        else open();
    });
    return button;
}

/** Underlined sub-tabs for showing one of a few related blocks at a time (e.g. two long prompts) instead of stacking them. */
export function SubTabs(items: Array<{ label: () => string; render: () => HTMLElement }>): { el: HTMLElement; refresh(): void } {
    const bar = h("div", { class: "ldpp-subtabs", attrs: { role: "tablist" } });
    const panel = h("div", { class: "ldpp-subtab-panel" });
    const buttons = items.map((item, index) => h("button", {
        type: "button",
        class: "ldpp-subtab",
        attrs: { role: "tab" },
        on: { click: () => select(index) },
    }, item.label()));
    const select = (index: number) => {
        buttons.forEach((button, i) => {
            button.classList.toggle("is-active", i === index);
            button.setAttribute("aria-selected", String(i === index));
        });
        panel.replaceChildren(items[index].render());
    };
    bar.append(...buttons);
    select(0);
    const refresh = () => buttons.forEach((button, i) => {
        const label = items[i].label();
        if (button.textContent !== label) button.textContent = label;
    });
    return { el: h("div", { class: "ldpp-subtabs-block" }, bar, panel), refresh };
}

export interface TabDef {
    id: string;
    label: string;
    icon?: () => SVGElement;
    render(): HTMLElement;
}

export function Tabs(tabs: TabDef[], { initial, vertical, onSelect }: { initial?: string; vertical?: boolean; onSelect?(id: string): void } = {}) {
    const list = h("div", { class: classes("ldpp-tabs", vertical && "ldpp-tabs-vertical"), attrs: { role: "tablist" } });
    const panel = h("div", { class: "ldpp-tab-panel", attrs: { role: "tabpanel" } });
    const buttons = new Map<string, HTMLButtonElement>();
    const select = (id: string) => {
        const tab = tabs.find(item => item.id === id) ?? tabs[0];
        if (!tab) return;
        for (const [tabId, button] of buttons) {
            button.classList.toggle("is-active", tabId === tab.id);
            button.setAttribute("aria-selected", String(tabId === tab.id));
        }
        panel.replaceChildren(tab.render());
        onSelect?.(tab.id);
    };
    for (const tab of tabs) {
        const button = h("button", { type: "button", class: "ldpp-tab", attrs: { role: "tab" }, on: { click: () => select(tab.id) } }, tab.icon?.(), h("span", null, tab.label));
        buttons.set(tab.id, button);
        list.appendChild(button);
    }
    select(initial ?? tabs[0]?.id ?? "");
    return { list, panel, select };
}
