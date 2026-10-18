/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// linux.do's watermark of January 2026 sat in a *closed* shadow root (attachShadow({ mode: "closed" })): from outside,
// its host is an empty box and the layer inside can be neither seen nor watched. LD++ starts before the page's own
// scripts, so it keeps a reference to every shadow root the page creates, leaving the mode and everything else as asked.

import { pageWindow } from "@utils/misc";

const roots = new WeakMap<Element, ShadowRoot>();
let original: Element["attachShadow"] | null = null;
let wrapper: Element["attachShadow"] | null = null;

/** The element's shadow root, open or (when the page created it after LD++ started) closed. */
export function shadowRootOf(el: Element): ShadowRoot | null {
    return el.shadowRoot ?? roots.get(el) ?? null;
}

/** For a node inside a shadow root, the outermost host in the document; otherwise the node itself. */
export function outerHost(node: Element): Element {
    let el = node;
    for (let root = el.getRootNode() as Node & { host?: Element }; root.host; root = el.getRootNode() as Node & { host?: Element }) el = root.host;
    return el;
}

export function hookShadowRoots(onRoot: (root: ShadowRoot) => void) {
    const proto = (pageWindow as typeof globalThis).Element.prototype;
    if (wrapper && proto.attachShadow === wrapper) return;
    const native = proto.attachShadow;
    original = native;
    wrapper = function (this: Element, init: ShadowRootInit) {
        const root = native.call(this, init);
        roots.set(this, root);
        try { onRoot(root); } catch { /* never break the page's own call */ }
        return root;
    };
    proto.attachShadow = wrapper;
}

export function unhookShadowRoots() {
    const proto = (pageWindow as typeof globalThis).Element.prototype;
    // Only put the original back if nothing has wrapped it again since.
    if (wrapper && proto.attachShadow === wrapper && original) proto.attachShadow = original;
    wrapper = original = null;
}
