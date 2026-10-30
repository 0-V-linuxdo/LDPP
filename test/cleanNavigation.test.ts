/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { isPluginEnabled, registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import CompactStyle, { settings as compactSettings } from "../src/plugins/compactStyle";
import HideElements, { PARTS as HIDE_PARTS, settings as hideSettings } from "../src/plugins/hideElements";
import NavLabels, { cssString, labelsCss, settings as navSettings, syncCounts, tabCount, tabLabel } from "../src/plugins/navLabels";

const styleText = (name: string) => document.querySelector<HTMLStyleElement>(`style[data-ldpp-style="${name}"]`)?.textContent ?? null;

describe("隐藏界面元素", () => {
    beforeAll(() => registerPlugin(HideElements));
    afterEach(() => {
        stopPlugin(HideElements);
        for (const key of Object.keys(HIDE_PARTS)) hideSettings.reset(key as keyof typeof HIDE_PARTS);
    });

    test("is off by default and hides every part once turned on", () => {
        expect(isPluginEnabled("HideElements")).toBe(false);
        startPlugin(HideElements);
        const css = styleText("hideElements-parts")!;
        for (const selector of Object.values(HIDE_PARTS)) expect(css).toContain(selector);
        expect(css).toContain("display: none !important;");
    });

    test("leaves out a part switched off, and drops the style when all are", () => {
        startPlugin(HideElements);
        hideSettings.store.postedTab = false;
        expect(styleText("hideElements-parts")).not.toContain("nav-item_posted");
        for (const key of Object.keys(HIDE_PARTS)) hideSettings.store[key as keyof typeof HIDE_PARTS] = false;
        expect(styleText("hideElements-parts")).toBeNull();
        stopPlugin(HideElements);
        expect(styleText("hideElements-parts")).toBeNull();
    });
});

describe("导航标签自定义", () => {
    beforeAll(() => registerPlugin(NavLabels));
    afterEach(() => {
        stopPlugin(NavLabels);
        navSettings.reset("labels");
        document.body.innerHTML = "";
    });

    test("starts from the user style's names, subtitles and colours", () => {
        expect(tabLabel("latest")).toEqual({ name: "最新 (Latest)", sub: "帖子", color: "#0000ff" });
        expect(tabLabel("unseen")).toEqual({ name: "未读 (Unseen)", sub: "帖子 + 话题", color: "" });
        expect(tabLabel("read")).toEqual({ name: "", sub: "", color: "" });
    });

    test("draws the new name with the site's count after it and the subtitle above", () => {
        const css = labelsCss([["new", { name: "新 (Created)", sub: "话题", color: "#ff0000" }]]);
        expect(css).toContain(`#navigation-bar > li.nav-item_new > a::before {\n    content: "新 (Created)" attr(data-ldpp-count);`);
        expect(css).toContain(`content: "话题";`);
        expect(css).toContain("color: #ff0000;");
        expect(css).toContain("font-size: 0 !important;");
        // On the tab, not the link: Discourse draws the active tab's underline with the link's ::after.
        expect(css).toContain("#navigation-bar > li.nav-item_new::after {");
        expect(css).not.toContain("> a::after");
    });

    test("a subtitle alone keeps the site's name, and an untouched tab gets no rule", () => {
        const css = labelsCss([["hot", { name: "", sub: "话题", color: "" }], ["read", { name: "", sub: "", color: "" }]]);
        expect(css).not.toContain("font-size: 0 !important");
        expect(css).not.toContain("::before");
        expect(css).not.toContain("color:");
        expect(css).not.toContain("nav-item_read");
    });

    test("quotes user text so it cannot break out of the CSS string", () => {
        expect(cssString(`a"b\\c\nd`)).toBe(`"a\\"b\\\\c d"`);
    });

    test("copies the site's count into the link and clears it when the count goes", () => {
        expect(tabCount("\n    新 (442)\n  ")).toBe(" (442)");
        expect(tabCount("最新")).toBe("");
        document.body.innerHTML = `<ul id="navigation-bar"><li class="new nav-item_new"><a href="/new">新 (442)</a></li><li class="latest nav-item_latest"><a href="/latest">最新</a></li></ul>`;
        syncCounts();
        const [count, plain] = document.querySelectorAll("#navigation-bar a");
        expect(count.getAttribute("data-ldpp-count")).toBe(" (442)");
        expect(plain.hasAttribute("data-ldpp-count")).toBe(false);
        expect(count.textContent).toBe("新 (442)");
        count.textContent = "新";
        syncCounts();
        expect(count.hasAttribute("data-ldpp-count")).toBe(false);
    });

    test("applies edits at once and removes everything when turned off", () => {
        document.body.innerHTML = `<ul id="navigation-bar"><li class="new nav-item_new"><a href="/new">新 (3)</a></li></ul>`;
        startPlugin(NavLabels);
        expect(styleText("navLabels-tabs")).toContain(`"最新 (Latest)"`);
        expect(styleText("navLabels-tabs")).toContain(".category-breadcrumb {\n    flex-basis: 100%;");
        expect(document.querySelector("#navigation-bar a")!.getAttribute("data-ldpp-count")).toBe(" (3)");
        navSettings.store.labels = { latest: { name: "Latest" } };
        expect(styleText("navLabels-tabs")).toContain(`content: "Latest" attr(data-ldpp-count);`);
        expect(styleText("navLabels-tabs")).toContain(`content: "帖子";`);
        stopPlugin(NavLabels);
        expect(styleText("navLabels-tabs")).toBeNull();
        expect(document.querySelector("[data-ldpp-count]")).toBeNull();
    });
});

describe("紧凑样式", () => {
    beforeAll(() => registerPlugin(CompactStyle));
    afterEach(() => {
        stopPlugin(CompactStyle);
        compactSettings.reset("timerHeading");
    });

    test("is off by default and carries each tweak behind its own switch", () => {
        expect(isPluginEnabled("CompactStyle")).toBe(false);
        startPlugin(CompactStyle);
        expect(styleText("compactStyle-parts")).toContain("span.sidebar-section-header-text");
        expect(styleText("compactStyle-parts")).toContain("h3.topic-timer-heading");
        compactSettings.store.timerHeading = false;
        expect(styleText("compactStyle-parts")).not.toContain("h3.topic-timer-heading");
        expect(styleText("compactStyle-parts")).toContain("custom-search-banner-wrap");
    });
});
