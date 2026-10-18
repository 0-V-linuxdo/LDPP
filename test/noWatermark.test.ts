/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import NoWatermark, { flushPending, fullScan } from "../src/plugins/noWatermark";
import { accountPattern, decodeSvgImages, Detector, hidingCss, imageUrls, type Probe, type Pseudo, selectorFor } from "../src/plugins/noWatermark/detect";
import { hookShadowRoots, unhookShadowRoots } from "../src/plugins/noWatermark/shadow";

const ACCOUNT = { username: "lin_x", id: "48213" };
const VIEW = { width: 1400, height: 900 };
const FULL = { left: 0, top: 0, width: 1400, height: 900 };
const svgTile = (text: string) => `url("data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120"><text x="10" y="60" transform="rotate(-20)" fill="#fff" fill-opacity="0.02">${text}</text></svg>`)}")`;

/** Boxes and computed styles set per element (and pseudo-element), like the browser would report them. */
function fakeProbe() {
    const rects = new Map<Element, typeof FULL>();
    const styles = new Map<string, Record<string, string>>();
    const ids = new WeakMap<Element, number>();
    let next = 0;
    const key = (el: Element, pseudo: Pseudo = "") => {
        if (!ids.has(el)) ids.set(el, next++);
        return `${ids.get(el)}${pseudo}`;
    };
    const base = { mixBlendMode: "normal", display: "block", visibility: "visible", content: "none", pointerEvents: "auto", position: "static", opacity: "1", color: "rgb(34, 34, 34)", backgroundImage: "none", backgroundRepeat: "repeat", width: "auto", height: "auto" };
    const probe: Probe = {
        rect: el => rects.get(el) ?? { left: 0, top: 0, width: 0, height: 0 },
        style: (el, pseudo = "") => ({ ...base, ...styles.get(key(el, pseudo)) }) as unknown as CSSStyleDeclaration,
        viewport: () => VIEW,
    };
    const set = (el: Element, rect: typeof FULL | null, style: Record<string, string> = {}, pseudo: Pseudo = "") => {
        if (rect) rects.set(el, rect);
        styles.set(key(el, pseudo), style);
        return el;
    };
    return { probe, set };
}

const div = (html = "", attrs: Record<string, string> = {}) => {
    const el = document.createElement("div");
    el.innerHTML = html;
    for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
    document.body.appendChild(el);
    return el;
};

describe("去除隐藏水印 detection", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    test("knows the account by name (any case, with @) or by its id as a whole number", () => {
        const pattern = accountPattern(ACCOUNT)!;
        expect(pattern.test("@LIN_X · 2026-10-06")).toBe(true);
        expect(pattern.test("uid 48213")).toBe(true);
        expect(pattern.test("1482130")).toBe(false);
        expect(accountPattern(null)).toBeNull();
        expect(decodeSvgImages(imageUrls(svgTile("@lin_x")))).toContain("@lin_x");
        expect(decodeSvgImages([`data:image/svg+xml;utf8,${encodeURIComponent("<svg><text>hi</text></svg>")}`])).toContain("<text>hi</text>");
    });

    test("finds the forms watermarks take: named tiles, generated tiles, canvases, faint text, pseudo-elements, shadow roots", () => {
        const { probe, set } = fakeProbe();
        const overlay = { position: "fixed", pointerEvents: "none" };
        const named = set(div(), FULL, { ...overlay, backgroundImage: svgTile("@lin_x") });
        const encoded = set(div(), FULL, { ...overlay, backgroundImage: 'url("data:image/png;base64,iVBORw0KGgo=")' });
        const canvas = set(document.body.appendChild(document.createElement("canvas")), FULL, overlay);
        const faint = set(div("a9f3c1 a9f3c1 a9f3c1"), FULL, { ...overlay, opacity: "0.04" });
        const host = div();
        const inner = host.attachShadow({ mode: "open" }).appendChild(document.createElement("div"));
        set(host, FULL);
        set(inner, FULL, { ...overlay, backgroundImage: svgTile("x") });
        const found = new Detector(ACCOUNT, probe).scan(document.body);
        const hit = (el: Element) => found.find(finding => finding.el === el);
        expect(hit(named)?.reasons).toContain("含你的用户名或 ID");
        expect(hit(encoded)?.part).toBe("layer");
        expect(hit(canvas)?.reasons).toContain("画布");
        expect(hit(faint)?.reasons).toContain("近乎透明");
        expect(hit(host)?.part).toBe("layer");

        const { probe: p2, set: s2 } = fakeProbe();
        s2(document.body, FULL, {}, "");
        s2(document.body, null, { content: '"@lin_x  @lin_x"', position: "fixed", pointerEvents: "none", opacity: "0.03" }, "::after");
        const container = s2(div("<p>帖子正文</p>"), { left: 300, top: 100, width: 700, height: 500 }, { backgroundImage: svgTile("lin_x") });
        const inPage = new Detector(ACCOUNT, p2).scan(document.body);
        expect(inPage.find(finding => finding.el === document.body)?.pseudo).toBe("::after");
        expect(inPage.find(finding => finding.el === container)?.part).toBe("background");
    });

    test("sees into closed shadow roots created after LD++ started: linux.do's January watermark", () => {
        const { probe, set } = fakeProbe();
        // As the page built it: an empty host, and in its closed root a full-screen tile of 「@user」 in rgb(2,2,2), blended with difference.
        const build = () => {
            const host = set(div(), { left: 0, top: 0, width: 1400, height: 0 });
            const layer = host.attachShadow({ mode: "closed" }).appendChild(document.createElement("div"));
            set(layer, FULL, { position: "fixed", pointerEvents: "none", backgroundImage: 'url("data:image/png;base64,iVBORw0KGgo=")', mixBlendMode: "difference" });
            return host;
        };
        const unseen = build();
        expect(unseen.shadowRoot).toBeNull();
        expect(new Detector(ACCOUNT, probe).scan(document.body)).toEqual([]);
        hookShadowRoots(() => {});
        try {
            const host = build();
            const found = new Detector(ACCOUNT, probe).scan(document.body);
            expect(found.map(finding => finding.el)).toEqual([host]);
            expect(found[0].reasons).toContain("混合模式 difference");
        } finally {
            unhookShadowRoots();
        }
    });

    test("leaves page UI alone: modals, menus, containers with the username, small icons, effects and the user's own themes", () => {
        const { probe, set } = fakeProbe();
        const overlay = { position: "fixed", pointerEvents: "none" };
        set(div('<div class="d-modal__container">lin_x</div>', { class: "d-modal" }), FULL, { position: "fixed" });
        set(div("<button>lin_x</button>"), FULL, { ...overlay, opacity: "0.1" });
        set(div("lin_x 的个人主页"), FULL, {});
        set(div(), { left: 10, top: 10, width: 16, height: 16 }, { ...overlay, backgroundImage: svgTile("lin_x") });
        set(document.body.appendChild(Object.assign(document.createElement("canvas"), { className: "snowfall" })), FULL, overlay);
        const wallpaper = 'url("data:image/png;base64,d2FsbHBhcGVy")';
        const userStyles = document.createElement("ldpp-user-styles");
        userStyles.innerHTML = `<style>body::before { background: ${wallpaper} repeat; }</style>`;
        document.body.appendChild(userStyles);
        set(div(), FULL, { ...overlay, backgroundImage: wallpaper });
        set(div("", { "data-ldpp": "sidebar" }), FULL, { ...overlay, backgroundImage: svgTile("lin_x") });
        expect(new Detector(ACCOUNT, probe).scan(document.body)).toEqual([]);
    });

    test("hides by appended rules that outweigh the page's and match the element as it sits now", () => {
        const { probe, set } = fakeProbe();
        div("", { id: "app" }).appendChild(document.createElement("section")).appendChild(document.createElement("span"));
        const layer = set(document.querySelector("#app span")!, FULL, { position: "absolute", pointerEvents: "none", backgroundImage: svgTile("@lin_x") });
        const [finding] = new Detector(ACCOUNT, probe).scan(document.body);
        expect(selectorFor(layer)).toBe("#app > section:nth-child(1) > span:nth-child(1)");
        expect(document.querySelector(selectorFor(layer))).toBe(layer);
        document.body.className = "category-1 archetype-regular";
        const atTop = div();
        expect(selectorFor(atTop)).toBe(`html > body > div:nth-child(${document.body.children.length})`);
        expect(hidingCss([finding])).toBe("html:not(#ldpp-no-watermark) #app > section:nth-child(1) > span:nth-child(1) { filter: opacity(0) !important; clip-path: inset(50%) !important; }");
        expect(hidingCss([{ ...finding, pseudo: "::after" }])).toContain("::after { content: none !important; background: none !important; }");
        expect(hidingCss([{ ...finding, part: "background" }])).toContain("{ background-image: none !important; }");
    });
});

describe("去除隐藏水印 plugin", () => {
    beforeAll(() => registerPlugin(NoWatermark));
    afterEach(() => {
        stopPlugin(NoWatermark);
        document.body.innerHTML = "";
        document.getElementById("data-preloaded")?.remove();
    });

    const rule = () => document.querySelector<HTMLStyleElement>("style[data-ldpp-style='no-watermark']");

    test("hides a watermark layer inserted after load, without touching the page's element", async () => {
        const preloaded = Object.assign(document.createElement("div"), { id: "data-preloaded" });
        preloaded.dataset.preloaded = JSON.stringify({ currentUser: JSON.stringify(ACCOUNT) });
        document.body.appendChild(preloaded);
        startPlugin(NoWatermark);
        fullScan();
        expect(rule()?.textContent ?? "").toBe("");

        const layer = document.createElement("div");
        layer.setAttribute("style", `position: fixed; inset: 0; pointer-events: none; background-image: ${svgTile("@lin_x")};`);
        layer.getBoundingClientRect = () => ({ ...FULL, right: 1400, bottom: 900, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
        const before = layer.outerHTML;
        document.body.appendChild(layer);
        await Promise.resolve();
        flushPending();
        expect(rule()?.textContent).toContain("filter: opacity(0) !important");
        expect(document.querySelector(rule()!.textContent!.split(" { ")[0].replace("html:not(#ldpp-no-watermark)", "html"))).toBe(layer);
        expect(layer.outerHTML).toBe(before);

        layer.remove();
        fullScan();
        expect(rule()?.textContent).toBe("");
        stopPlugin(NoWatermark);
        expect(rule()).toBeNull();
    });

    test("watches inside a closed shadow root the page creates, and hides its host", async () => {
        const nativeAttach = Element.prototype.attachShadow;
        startPlugin(NoWatermark);
        const host = document.body.appendChild(document.createElement("div"));
        const root = host.attachShadow({ mode: "closed" });
        await Promise.resolve();
        flushPending();
        expect(rule()?.textContent ?? "").toBe("");
        // The layer arrives in the closed root after the host is on the page, as the January script did it.
        const layer = document.createElement("div");
        layer.setAttribute("style", "position: fixed; inset: 0; pointer-events: none; mix-blend-mode: difference; background-image: url(data:image/png;base64,iVBORw0KGgo=); background-repeat: repeat;");
        layer.getBoundingClientRect = () => ({ ...FULL, right: 1400, bottom: 900, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
        root.appendChild(layer);
        await Promise.resolve();
        flushPending();
        expect(rule()?.textContent).toContain("html:not(#ldpp-no-watermark) > body > div:nth-child(1) { filter: opacity(0)");
        stopPlugin(NoWatermark);
        expect(Element.prototype.attachShadow).toBe(nativeAttach);
    });

    test("keeps a host hidden although hiding it moves the layer away (a filter re-anchors fixed boxes inside it)", async () => {
        startPlugin(NoWatermark);
        const host = document.body.appendChild(document.createElement("div"));
        const layer = host.attachShadow({ mode: "closed" }).appendChild(document.createElement("div"));
        layer.setAttribute("style", "position: fixed; inset: 0; pointer-events: none; mix-blend-mode: difference; background-image: url(data:image/png;base64,iVBORw0KGgo=);");
        // As in the browser: while LD++'s rule applies to the host, its fixed layer is laid out below the page, off screen.
        const hidingApplies = () => { const el = rule(); return Boolean(el && !el.disabled && el.textContent); };
        layer.getBoundingClientRect = () => ({ ...FULL, top: hidingApplies() ? 2635 : 0, right: 1400, bottom: 900, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
        await Promise.resolve();
        flushPending();
        expect(rule()?.textContent).toContain("filter: opacity(0)");
        for (let scan = 0; scan < 3; scan++) {
            fullScan();
            expect(rule()?.textContent).toContain("filter: opacity(0)");
            expect(rule()?.disabled).toBe(false);
        }
    });
});
