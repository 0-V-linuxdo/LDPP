/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Child = Node | string | number | null | undefined | false | Child[];

export interface Props {
    class?: string;
    style?: Record<string, string>;
    dataset?: Record<string, string>;
    attrs?: Record<string, string | number | boolean | null | undefined>;
    on?: Partial<Record<keyof HTMLElementEventMap, (event: any) => void>>;
    [key: string]: unknown;
}

const SVG_NS = "http://www.w3.org/2000/svg";

export const LDPP_ATTR = "data-ldpp";

function applyProps(el: Element, props: Props) {
    for (const [key, value] of Object.entries(props)) {
        if (value === undefined) continue;
        switch (key) {
            case "class":
                el.setAttribute("class", String(value));
                break;
            case "style":
                for (const [prop, val] of Object.entries(value as Record<string, string>)) (el as HTMLElement).style.setProperty(prop, val);
                break;
            case "dataset":
                Object.assign((el as HTMLElement).dataset, value);
                break;
            case "attrs":
                for (const [name, val] of Object.entries(value as Record<string, unknown>)) {
                    if (val == null || val === false) el.removeAttribute(name);
                    else el.setAttribute(name, val === true ? "" : String(val));
                }
                break;
            case "on":
                for (const [type, handler] of Object.entries(value as Record<string, EventListener>)) el.addEventListener(type, handler);
                break;
            default:
                (el as unknown as Record<string, unknown>)[key] = value;
        }
    }
}

export function append(parent: Node, ...children: Child[]) {
    for (const child of children) {
        if (child == null || child === false) continue;
        if (Array.isArray(child)) append(parent, ...child);
        else parent.appendChild(typeof child === "object" ? child : document.createTextNode(String(child)));
    }
}

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props?: Props | null, ...children: Child[]): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (props) applyProps(el, props);
    append(el, ...children);
    return el;
}

export function svg(viewBox: string, inner: Array<[string, Record<string, string>]>, size = 16): SVGSVGElement {
    const root = document.createElementNS(SVG_NS, "svg");
    root.setAttribute("viewBox", viewBox);
    root.setAttribute("width", String(size));
    root.setAttribute("height", String(size));
    root.setAttribute("aria-hidden", "true");
    root.setAttribute("focusable", "false");
    for (const [tag, attrs] of inner) {
        const node = document.createElementNS(SVG_NS, tag);
        for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
        root.appendChild(node);
    }
    return root;
}

export function mark<T extends Element>(el: T, owner: string): T {
    el.setAttribute(LDPP_ATTR, owner);
    return el;
}

export function isOwnNode(node: Node | null): boolean {
    const el = node instanceof Element ? node : node?.parentElement;
    return Boolean(el?.closest(`[${LDPP_ATTR}]`));
}

/**
 * Publishes the width of an element's vertical scrollbar (0 with overlay scrollbars) as --ldpp-scrollbar, so CSS can
 * take it out of the padding beside it: content then ends at the same x with or without a classic scrollbar.
 * Watching stops once the element, having been on the page, is taken off it (views re-render their scroll areas).
 */
export function trackScrollbar<T extends HTMLElement>(el: T): T {
    let shown = false;
    const observer = new ResizeObserver(() => {
        if (el.isConnected) shown = true;
        else if (shown) return observer.disconnect();
        el.style.setProperty("--ldpp-scrollbar", `${el.offsetWidth - el.clientWidth}px`);
    });
    observer.observe(el);
    return el;
}

export function setClass(el: Element, name: string, on: boolean) {
    if (el.classList.contains(name) !== on) el.classList.toggle(name, on);
}

export function clear(el: Element) {
    el.replaceChildren();
}

export function onReady(fn: () => void) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
}
