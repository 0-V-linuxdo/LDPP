/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IconButton } from "@components/controls";
import { CloseIcon } from "@components/icons";
import { h, mark } from "@utils/dom";
import { truncateVisual } from "@utils/text";

import { resolveTopicTitle } from "./Discourse";

export type ToastType = "info" | "success" | "warning" | "error" | "loading";
type TimedType = Exclude<ToastType, "loading">;

export interface ToastConfig {
    enabled: boolean;
    durations: Record<TimedType, number>;
}

export interface ToastOptions {
    topicId?: string;
    key?: string;
    duration?: number;
    onClick?(): void;
    onDismiss?(): void;
}

export interface ToastHandle {
    readonly closed: boolean;
    update(message: string, type?: ToastType, duration?: number): void;
    close(): void;
}

const DEFAULT_CONFIG: ToastConfig = { enabled: true, durations: { info: 3, success: 4, warning: 6, error: 0 } };
const TITLE_WIDTH = 34;

let readConfig: () => ToastConfig = () => DEFAULT_CONFIG;
const byKey = new Map<string, ToastHandle>();

export function configureToasts(getter: () => ToastConfig) {
    readConfig = getter;
}

function container(): HTMLElement {
    const found = document.querySelector<HTMLElement>(".ldpp-toasts");
    if (found) return found;
    const root = mark(h("div", { class: "ldpp-toasts", attrs: { "aria-live": "polite" } }), "toasts");
    document.body.appendChild(root);
    return root;
}

function durationFor(type: ToastType, explicit?: number): number {
    if (explicit != null) return explicit;
    if (type === "loading") return 0;
    return Math.max(0, readConfig().durations[type] ?? 0) * 1000;
}

const NOOP: ToastHandle = { closed: true, update() {}, close() {} };

export function closeToast(key: string) {
    byKey.get(key)?.close();
}

export function showToast(message: string, type: ToastType = "info", options: ToastOptions = {}): ToastHandle {
    if (!readConfig().enabled && type !== "error") return NOOP;
    const existing = options.key ? byKey.get(options.key) : undefined;
    if (existing && !existing.closed) {
        existing.update(message, type, options.duration);
        return existing;
    }
    const text = h("span", { class: "ldpp-toast-text" }, message);
    const topicLine = options.topicId ? h("div", { class: "ldpp-toast-topic" }, `📌 话题 #${options.topicId}`) : null;
    const el = h("div", { class: `ldpp-toast ldpp-toast-${type}`, attrs: { role: type === "error" ? "alert" : "status" } },
        h("span", { class: "ldpp-toast-dot" }),
        h("div", { class: "ldpp-toast-main" }, text, topicLine),
    );
    let timer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;
    const arm = (ms: number) => {
        if (timer) clearTimeout(timer);
        timer = ms > 0 ? setTimeout(() => handle.close(), ms) : null;
    };
    const handle: ToastHandle = {
        get closed() { return closed; },
        update(next, nextType = type, duration) {
            if (closed) return;
            text.textContent = next;
            el.className = `ldpp-toast ldpp-toast-${nextType} is-shown`;
            if (options.onClick) el.classList.add("is-clickable");
            arm(durationFor(nextType, duration));
        },
        close() {
            if (closed) return;
            closed = true;
            if (timer) clearTimeout(timer);
            if (options.key && byKey.get(options.key) === handle) byKey.delete(options.key);
            el.classList.remove("is-shown");
            setTimeout(() => el.remove(), 220);
        },
    };
    el.appendChild(IconButton(CloseIcon(14), {
        title: "关闭",
        className: "ldpp-toast-close",
        onClick: event => {
            event.stopPropagation();
            options.onDismiss?.();
            handle.close();
        },
    }));
    if (options.onClick) {
        el.classList.add("is-clickable");
        // As in the original summary script: a click takes you to the topic and the toast goes away. Only the × button
        // counts as dismissing it, so onDismiss (which cancels a running summary) is not called here.
        el.addEventListener("click", () => {
            if (closed) return;
            options.onClick?.();
            handle.close();
        });
    }
    if (options.topicId && topicLine) {
        const topicId = options.topicId;
        resolveTopicTitle(topicId).then(title => {
            if (!title || closed) return;
            topicLine.textContent = `📌 ${truncateVisual(title, TITLE_WIDTH)}`;
            topicLine.title = title;
        }, () => undefined);
    }
    container().appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-shown"));
    arm(durationFor(type, options.duration));
    if (options.key) byKey.set(options.key, handle);
    return handle;
}
