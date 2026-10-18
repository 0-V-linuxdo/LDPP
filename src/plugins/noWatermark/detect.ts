/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// What counts as a watermark layer. Page watermarks are drawn the same few ways (a full-screen overlay that lets clicks
// through, carrying a tiled generated image, a canvas, an SVG or faint repeated text, sometimes in ::before / ::after or
// a shadow root), and the one linux.do used carried the viewer's username. No single property is enough (Discourse and
// themes have overlays too), so a layer needs several signals together, and anything carrying the account's name or id.

import { pageWindow } from "@utils/misc";
import { escapeRegExp } from "@utils/text";

import { shadowRootOf } from "./shadow";

export interface Account {
    username: string;
    id: string;
}

export type Pseudo = "" | "::before" | "::after";

export interface Finding {
    /** The element whose box (or pseudo-element) carries the watermark; for one inside a shadow root, its host. */
    el: Element;
    pseudo: Pseudo;
    /** "layer": hide the whole box; "background": only drop its background image (the content above it stays). */
    part: "layer" | "background";
    reasons: string[];
}

export interface Probe {
    rect(el: Element): { left: number; top: number; width: number; height: number };
    style(el: Element, pseudo?: Pseudo): CSSStyleDeclaration;
    viewport(): { width: number; height: number };
}

export const realProbe: Probe = {
    rect: el => el.getBoundingClientRect(),
    style: (el, pseudo) => getComputedStyle(el, pseudo || null),
    viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
};

/** Discourse's and LD++'s own layers, and effects themes draw on purpose. */
const SKIP = "[data-ldpp], ldpp-styles, ldpp-user-styles, #d-splash, .d-modal, .d-modal__backdrop, .modal-backdrop, .d-header-wrap, #reply-control, .loading-indicator-container, .pswp";
/** A watermark is inert: a box with something to click or type into is page UI. */
const INTERACTIVE = "button, a[href], input, textarea, select, iframe, [contenteditable], [tabindex]";
const EFFECTS = /snow|confetti|firework|particle|sakura|petal/i;

/** The signed-in account, from Discourse's current-user service or the data the page was served with. */
export function currentAccount(): Account | null {
    try {
        const user = (pageWindow as { Discourse?: { __container__?: { lookup(name: string): { username?: string; id?: number } | null } } }).Discourse?.__container__?.lookup("service:current-user");
        if (user?.username) return { username: String(user.username), id: String(user.id ?? "") };
    } catch { /* not booted yet */ }
    try {
        const preloaded = JSON.parse(document.getElementById("data-preloaded")?.dataset.preloaded ?? "{}") as { currentUser?: unknown };
        const raw = preloaded.currentUser;
        const user = (typeof raw === "string" ? JSON.parse(raw) : raw) as { username?: string; id?: number } | undefined;
        if (user?.username) return { username: String(user.username), id: String(user.id ?? "") };
    } catch { /* anonymous, or not served yet */ }
    return null;
}

/** Matches the account's username (any case, with or without @) or its numeric id as a whole number. */
export function accountPattern(account: Account | null): RegExp | null {
    if (!account?.username) return null;
    const parts = [escapeRegExp(account.username)];
    if (/^\d{3,}$/.test(account.id)) parts.push(`(?<!\\d)${account.id}(?!\\d)`);
    return new RegExp(parts.join("|"), "i");
}

/** The url(...) values in a background-image. */
export function imageUrls(value: string): string[] {
    return [...value.matchAll(/url\((["']?)(.*?)\1\)/g)].map(match => match[2]);
}

/** The text inside SVG data URIs (where a generated watermark keeps its <text>). */
export function decodeSvgImages(urls: string[]): string {
    return urls.map(url => {
        const match = url.match(/^data:image\/svg\+xml(;base64)?[^,]*,(.*)$/i);
        if (!match) return "";
        try {
            return match[1] ? atob(match[2]) : decodeURIComponent(match[2]);
        } catch {
            return "";
        }
    }).join("\n");
}

const generated = (url: string) => /^(data|blob):/i.test(url);

function alphaOf(color: string): number {
    const match = color.match(/rgba?\(([^)]*)\)/);
    if (!match) return 1;
    const parts = match[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 4) return 1;
    const value = parts[3].endsWith("%") ? Number.parseFloat(parts[3]) / 100 : Number.parseFloat(parts[3]);
    return Number.isFinite(value) ? value : 1;
}

/** Images a theme of the user's own (LD++ 「主题」 / quick CSS, Stylus) puts there: never a watermark. */
function userStyleText(): string {
    return Array.from(document.querySelectorAll("ldpp-user-styles style, style.stylus"), style => style.textContent ?? "").join("\n");
}

export class Detector {
    private readonly pattern: RegExp | null;
    private readonly userCss: string;

    constructor(account: Account | null, private readonly probe: Probe = realProbe) {
        this.pattern = accountPattern(account);
        this.userCss = userStyleText();
    }

    /** How much of the viewport, or of the parent box, a rect covers. */
    private covers(el: Element, rect: { left: number; top: number; width: number; height: number }): boolean {
        const view = this.probe.viewport();
        const width = Math.max(0, Math.min(rect.left + rect.width, view.width) - Math.max(rect.left, 0));
        const height = Math.max(0, Math.min(rect.top + rect.height, view.height) - Math.max(rect.top, 0));
        if (view.width * view.height > 0 && (width * height) / (view.width * view.height) >= 0.5) return true;
        const parent = el.parentElement;
        if (!parent || rect.width * rect.height < 200 * 150) return false;
        const box = this.probe.rect(parent);
        return rect.width >= box.width * 0.9 && rect.height >= box.height * 0.9;
    }

    private mentions(...texts: string[]): boolean {
        return Boolean(this.pattern && texts.some(text => text && this.pattern!.test(text)));
    }

    private ownImage(urls: string[]): boolean {
        return urls.some(url => this.userCss.includes(url.slice(0, 200)));
    }

    /** One box (the element itself, or one of its pseudo-elements) judged on its own. */
    check(el: Element, pseudo: Pseudo = ""): Finding | null {
        if (el.closest(SKIP) || EFFECTS.test(`${el.id} ${el.getAttribute("class") ?? ""}`)) return null;
        const style = this.probe.style(el, pseudo);
        if (style.display === "none" || style.visibility === "hidden") return null;
        if (pseudo && (!style.content || style.content === "none" || style.content === "normal")) return null;
        const hostRect = this.probe.rect(el);
        const rect = pseudo ? this.pseudoRect(style, hostRect) : hostRect;
        if (!rect) return null;
        // An overlay covers the screen or its container; a watermark drawn into a box's own background needs a box.
        const covers = this.covers(el, rect);
        if (!covers && rect.width * rect.height < 300 * 150) return null;

        const urls = imageUrls(style.backgroundImage || "");
        if (this.ownImage(urls)) return null;
        const svgText = decodeSvgImages(urls);
        const text = pseudo ? style.content.replace(/^["']|["']$/g, "") : el.childElementCount < 300 ? (el.textContent ?? "").slice(0, 4000) : "";
        const passThrough = style.pointerEvents === "none";
        const floating = /fixed|absolute|sticky/.test(style.position);
        const faint = Number.parseFloat(style.opacity || "1") < 0.3 || (text.trim() !== "" && alphaOf(style.color) < 0.3);
        // The January watermark: near-black marks (rgb(2,2,2)) blended with `difference`, invisible yet in every pixel.
        const blended = Boolean(style.mixBlendMode) && style.mixBlendMode !== "normal";
        const tiled = urls.length > 0 && !/no-repeat/.test(style.backgroundRepeat || "");
        const tile = tiled && urls.some(generated);
        const drawn = el.tagName === "CANVAS" || (el.tagName.toLowerCase() === "svg" && Boolean(el.querySelector("text, pattern")));
        const named = this.mentions(text, svgText, pseudo ? "" : el.getAttribute("aria-label") ?? "");

        const reasons: string[] = [];
        if (named) reasons.push("含你的用户名或 ID");
        if (tile) reasons.push(/<text[\s>]/i.test(svgText) ? "平铺的文字图片" : "平铺的生成图片");
        if (drawn) reasons.push(el.tagName === "CANVAS" ? "画布" : "SVG 图案");
        if (faint) reasons.push("近乎透明");
        if (blended) reasons.push(`混合模式 ${style.mixBlendMode}`);
        if (passThrough) reasons.push("不挡点击");

        if (!pseudo && el.querySelector(INTERACTIVE)) return null;
        const layer = covers && ((named && (passThrough || faint || blended))
            || (passThrough && floating && (tile || drawn))
            || (passThrough && floating && (faint || blended) && (text.trim() !== "" || urls.length > 0)));
        if (layer) return { el, pseudo, part: "layer", reasons: [...reasons, "铺满屏幕或容器"] };
        // A container (post, page) with a watermark drawn into its own background: drop just the background.
        if (!pseudo && tile && (named || /<text[\s>]/i.test(svgText))) return { el, pseudo, part: "background", reasons: [...reasons, "画在容器背景里"] };
        return null;
    }

    /** A positioned pseudo-element's box, from its resolved size (it has no rect of its own). */
    private pseudoRect(style: CSSStyleDeclaration, host: { left: number; top: number; width: number; height: number }) {
        if (!/fixed|absolute/.test(style.position)) return null;
        const view = this.probe.viewport();
        const base = style.position === "fixed" ? { left: 0, top: 0, width: view.width, height: view.height } : host;
        const width = Number.parseFloat(style.width);
        const height = Number.parseFloat(style.height);
        return { left: base.left, top: base.top, width: Number.isFinite(width) ? width : base.width, height: Number.isFinite(height) ? height : base.height };
    }

    /** Every box under `root`, shadow roots included (closed ones the page created after LD++ started); a finding inside one is reported on its outermost host. */
    scan(root: ParentNode, out: Finding[] = [], host?: Element): Finding[] {
        const elements = root instanceof Element ? [root, ...root.querySelectorAll("*")] : [...root.querySelectorAll("*")];
        for (const el of elements) {
            const finding = this.check(el);
            if (finding) out.push(host ? { ...finding, el: host } : finding);
            if (!finding && this.pseudoCandidate(el)) {
                for (const pseudo of ["::before", "::after"] as const) {
                    const inPseudo = this.check(el, pseudo);
                    if (inPseudo) out.push(host ? { ...inPseudo, el: host, pseudo: "" } : inPseudo);
                }
            }
            const shadow = shadowRootOf(el);
            if (shadow) this.scan(shadow, out, host ?? el);
        }
        return out;
    }

    /** Pseudo-elements are checked on the page's top boxes and on anything that covers most of the screen. */
    private pseudoCandidate(el: Element): boolean {
        const parent = el.parentElement;
        if (el === document.documentElement || el === document.body || parent === document.body || parent === document.documentElement || el.id) return true;
        const rect = this.probe.rect(el);
        const view = this.probe.viewport();
        return rect.width >= view.width * 0.6 && rect.height >= view.height * 0.5;
    }
}

const escapeIdent = (value: string) => (typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(value) : value.replace(/[^\w-]/g, char => `\\${char}`));

/** A selector that matches `el` now: its unique id, or the child path down from the nearest one (or <html>). */
export function selectorFor(el: Element): string {
    const parts: string[] = [];
    for (let node: Element | null = el; node && node !== document.documentElement; node = node.parentElement) {
        // <body> is one of a kind, and its classes change from page to page.
        if (node === document.body) {
            parts.unshift("body");
            continue;
        }
        if (node.id && document.querySelectorAll(`#${escapeIdent(node.id)}`).length === 1) {
            parts.unshift(`#${escapeIdent(node.id)}`);
            return parts.join(" > ");
        }
        const parent = node.parentElement;
        const index = parent ? Array.prototype.indexOf.call(parent.children, node) + 1 : 1;
        const classes = Array.from(node.classList).filter(name => !/^ember\d/.test(name)).slice(0, 2).map(name => `.${escapeIdent(name)}`).join("");
        parts.unshift(`${node.tagName.toLowerCase()}${classes}:nth-child(${index})`);
    }
    parts.unshift("html");
    return parts.join(" > ");
}

/** Rules that hide the findings without touching the page's own elements: nothing for a watermark guard to undo. */
export function hidingCss(findings: readonly Finding[]): string {
    // `html:not(#…)` lifts the rules over the page's own (an id's weight); inline styles rarely set filter or clip-path.
    const scope = "html:not(#ldpp-no-watermark)";
    return findings.map(finding => {
        const selector = selectorFor(finding.el);
        const target = selector.startsWith("html") ? selector.replace(/^html/, scope) : `${scope} ${selector}`;
        if (finding.pseudo) return `${target}${finding.pseudo} { content: none !important; background: none !important; }`;
        if (finding.part === "background") return `${target} { background-image: none !important; }`;
        return `${target} { filter: opacity(0) !important; clip-path: inset(50%) !important; }`;
    }).join("\n");
}

export function describe(el: Element): string {
    const classes = Array.from(el.classList).slice(0, 2).map(name => `.${name}`).join("");
    return `<${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${classes}>`;
}
