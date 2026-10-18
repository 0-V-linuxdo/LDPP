/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button, type ButtonKind, IconButton, InfoTip } from "@components/controls";
import { ChevronLeftIcon, CloseIcon, TrashIcon } from "@components/icons";
import { classes } from "@utils/css";
import { append, type Child, h, mark } from "@utils/dom";

export interface DialogAction {
    label: string;
    kind?: ButtonKind;
    onClick?(): boolean | void | Promise<boolean | void>;
}

export interface DialogOptions {
    title: string;
    /** Optional icon shown before the title. */
    icon?: SVGElement;
    /** Colours the title icon red, for blocking / deleting dialogs. */
    danger?: boolean;
    /** Optional explanation, shown as an ⓘ next to the title. */
    info?: Child;
    /**
     * For a dialog that takes the place of the large dialog it was opened from: a ‹ button with this label returns
     * to that dialog, and × closes both.
     */
    back?: string;
    body: Child;
    actions?: DialogAction[];
    size?: "small" | "medium" | "large";
    className?: string;
    onClose?(): void;
}

export interface DialogHandle {
    readonly root: HTMLElement;
    readonly body: HTMLElement;
    close(): void;
    setBody(body: Child): void;
}

const stack: DialogHandle[] = [];
const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

function onKeydown(event: KeyboardEvent) {
    const top = stack.at(-1);
    if (!top) return;
    if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        top.close();
        return;
    }
    if (event.key !== "Tab") return;
    const items = Array.from(top.root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

export function openDialog({ title, icon, danger, info, back, body, actions = [], size = "medium", className, onClose }: DialogOptions): DialogHandle {
    const previousFocus = document.activeElement as HTMLElement | null;
    const content = h("div", { class: "ldpp-dialog-body" }, body);
    const footer = actions.length ? h("div", { class: "ldpp-dialog-footer" }) : null;
    const heading = h("h2", { class: "ldpp-dialog-title" }, icon, title, info ? InfoTip(info) : null);
    const box = h("div", { class: classes("ldpp-dialog", `ldpp-dialog-${size}`, danger && "is-danger", className), attrs: { role: "dialog", "aria-modal": "true", "aria-label": title, tabindex: "-1" } },
        h("div", { class: "ldpp-dialog-header" },
            back ? h("div", { class: "ldpp-dialog-heading" }, IconButton(ChevronLeftIcon(20), { title: back, className: "ldpp-dialog-back", onClick: () => handle.close() }), heading) : heading,
            IconButton(CloseIcon(18), { title: "关闭", onClick: () => back ? closeAllDialogs() : handle.close() }),
        ),
        content,
        footer,
    );
    // A large dialog over a large dialog occupies the same box: hide the one underneath instead of letting its edges,
    // shadow and anti-aliased corners show around the new one. It keeps its scroll position for when this one closes.
    const below = stack.at(-1);
    const covers = size === "large" && below?.root.classList.contains("ldpp-dialog-large") === true;
    if (covers) below?.root.parentElement?.classList.add("is-covered");
    const overlay = mark(h("div", { class: classes("ldpp-dialog-overlay", stack.length > 0 && "is-nested") }, box), "dialog");
    overlay.addEventListener("mousedown", event => {
        if (event.target === overlay) handle.close();
    });
    let closed = false;
    const handle: DialogHandle = {
        root: box,
        body: content,
        close() {
            if (closed) return;
            closed = true;
            overlay.remove();
            if (covers) below?.root.parentElement?.classList.remove("is-covered");
            stack.splice(stack.indexOf(handle), 1);
            if (!stack.length) {
                document.removeEventListener("keydown", onKeydown, true);
                document.documentElement.classList.remove("ldpp-dialog-open");
            }
            onClose?.();
            previousFocus?.focus?.({ preventScroll: true });
        },
        setBody(next) {
            content.replaceChildren();
            append(content, next);
        },
    };
    for (const action of actions) {
        const button = Button(action.label, {
            kind: action.kind ?? "default",
            onClick: async () => {
                button.disabled = true;
                try {
                    const keepOpen = await action.onClick?.();
                    if (keepOpen !== false) handle.close();
                } finally {
                    button.disabled = false;
                }
            },
        });
        footer?.appendChild(button);
    }
    if (!stack.length) {
        document.addEventListener("keydown", onKeydown, true);
        document.documentElement.classList.add("ldpp-dialog-open");
    }
    stack.push(handle);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => box.focus({ preventScroll: true }));
    return handle;
}

export function confirmDialog(message: Child, { title = "请确认", okLabel = "确定", danger = false, icon }: { title?: string; okLabel?: string; danger?: boolean; icon?: SVGElement } = {}): Promise<boolean> {
    return new Promise(resolve => {
        let result = false;
        openDialog({
            title,
            icon: icon ?? (danger ? TrashIcon(18) : undefined),
            danger,
            size: "small",
            body: h("div", { class: "ldpp-confirm-text" }, message),
            actions: [
                { label: "取消" },
                { label: okLabel, kind: danger ? "danger" : "primary", onClick: () => { result = true; } },
            ],
            onClose: () => resolve(result),
        });
    });
}

export function closeAllDialogs() {
    for (const dialog of stack.toReversed()) dialog.close();
}
