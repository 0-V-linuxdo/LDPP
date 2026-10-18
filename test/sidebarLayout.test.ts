/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { registerPlugin } from "../src/api/PluginManager";
import TopicQA from "../src/plugins/topicQA";
import { cssLength, nativeSidebarBox, panelWidth, syncSidebar, unmountSidebar } from "../src/plugins/topicSummary/sidebar";

function nativeSidebar(left: number, width: number) {
    document.body.className = "has-sidebar-page";
    document.body.innerHTML = `<div id="main-outlet-wrapper"><div class="sidebar-wrapper"></div><div id="main-outlet"></div></div>`;
    const sidebar = document.querySelector(".sidebar-wrapper") as HTMLElement;
    Object.defineProperty(sidebar, "offsetWidth", { value: width });
    sidebar.getBoundingClientRect = () => ({ left, x: left, top: 40, y: 40, right: left + width, bottom: 1049, width, height: 1009, toJSON() {} });
}

describe("summary sidebar width", () => {
    afterEach(() => {
        document.body.className = "";
        document.body.innerHTML = "";
    });

    test("on the left it ends exactly at the native sidebar's right edge; on the right it is as wide as that sidebar", () => {
        expect(panelWidth("left", { left: 11, width: 178 })).toBe(189);
        expect(panelWidth("right", { left: 11, width: 178 })).toBe(178);
    });

    test("follows the sidebar's current (dragged) size", () => {
        nativeSidebar(11, 178);
        expect(nativeSidebarBox()).toEqual({ left: 11, width: 178 });
        nativeSidebar(11, 320);
        expect(panelWidth("left", nativeSidebarBox())).toBe(331);
    });

    test("reads the width the collapsed sidebar is set to (px from 「侧边栏宽度」, or linux.do's 15em)", () => {
        expect(cssLength("178px", 16, 16)).toBe(178);
        expect(cssLength(" 15em", 16, 16)).toBe(240);
        expect(cssLength("12rem", 14, 16)).toBe(192);
        expect(cssLength("calc(1px)", 16, 16)).toBeNull();
    });
});

describe("summary sidebar header", () => {
    afterEach(() => {
        unmountSidebar();
        (window as unknown as { history: History }).history.replaceState(null, "", "/latest");
        document.body.innerHTML = "";
    });

    test("the 总结 / 提问 tabs are the header (no title row of their own) and switching keeps them there", () => {
        registerPlugin(TopicQA);
        (window as unknown as { history: History }).history.replaceState(null, "", "/t/topic/77");
        syncSidebar({ position: "left", autoOpen: true });
        const header = document.querySelector(".ldpp-sidebar-header")!;
        const tabs = () => [...header.querySelectorAll(".ldpp-sidebar-tab")];
        expect(tabs().map(tab => tab.textContent)).toEqual(["总结", "提问"]);
        expect(header.textContent).not.toContain("话题助手");
        expect(header.querySelector(".ldpp-sidebar-settings")).not.toBeNull();
        expect(document.querySelector(".ldpp-sidebar-body .ldpp-sidebar-tabs")).toBeNull();
        expect(document.querySelector(".ldpp-sidebar-body > .ldpp-sv")).not.toBeNull();
        (tabs()[1] as HTMLElement).click();
        expect(tabs()[1].getAttribute("aria-selected")).toBe("true");
        expect(document.querySelector(".ldpp-sidebar-body > .ldpp-qa")).not.toBeNull();
        expect(header.querySelector(".ldpp-sidebar-settings")?.getAttribute("title")).toBe("提问设置");
    });
});
