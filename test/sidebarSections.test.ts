/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { isPluginEnabled, registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import SidebarSections, { applySections, presetStorage, resetHandled, sectionKind, settings } from "../src/plugins/sidebarSections";

const hoverCss = () => document.querySelector<HTMLStyleElement>('style[data-ldpp-style="sidebarSections-hover"]')?.textContent ?? null;

/** A sidebar section as Discourse draws it; its header flips aria-expanded when clicked. */
function section(name: string, expanded: boolean): HTMLElement {
    const el = document.createElement("div");
    el.className = "sidebar-section sidebar-section-wrapper";
    el.dataset.sectionName = name;
    el.innerHTML = `<div class="sidebar-section-header-wrapper sidebar-row"><button class="sidebar-section-header sidebar-section-header-collapsable" aria-expanded="${expanded}"></button></div>`;
    const header = el.querySelector("button")!;
    header.addEventListener("click", () => header.setAttribute("aria-expanded", String(header.getAttribute("aria-expanded") !== "true")));
    document.body.append(el);
    return el;
}

const expanded = (el: HTMLElement) => el.querySelector("button")!.getAttribute("aria-expanded");

describe("侧栏分区默认状态", () => {
    beforeAll(() => registerPlugin(SidebarSections));
    afterEach(() => {
        stopPlugin(SidebarSections);
        for (const key of Object.keys(settings.def)) settings.reset(key as keyof typeof settings.def);
        resetHandled();
        localStorage.clear();
        document.body.innerHTML = "";
    });

    test("is off by default and puts the custom sections together", () => {
        expect(isPluginEnabled("SidebarSections")).toBe(false);
        expect(sectionKind("categories")).toBe("categories");
        expect(sectionKind("1")).toBe("other");
        expect(sectionKind("chat-channels")).toBe("other");
    });

    test("writes Discourse's remembered state, also for custom sections it has seen, and leaves 「keep」 alone", () => {
        localStorage.setItem("discourse_sidebar-section-资源-collapsed", "true");
        localStorage.setItem("discourse_sidebar-section-messages-collapsed", "true");
        settings.store.other = "expand";
        presetStorage();
        expect(localStorage.getItem("discourse_sidebar-section-categories-collapsed")).toBe("false");
        expect(localStorage.getItem("discourse_sidebar-section-tags-collapsed")).toBe("true");
        expect(localStorage.getItem("discourse_sidebar-section-资源-collapsed")).toBe("false");
        expect(localStorage.getItem("discourse_sidebar-section-messages-collapsed")).toBe("true");
        expect(localStorage.getItem("discourse_sidebar-section-community-collapsed")).toBeNull();
    });

    test("sets each drawn section once per page load", () => {
        const categories = section("categories", false);
        const tags = section("tags", true);
        const custom = section("1", false);
        expect(applySections()).toBe(2);
        expect(expanded(categories)).toBe("true");
        expect(expanded(tags)).toBe("false");
        expect(expanded(custom)).toBe("false");
        // The user opens 标签 again: it stays open.
        tags.querySelector("button")!.click();
        expect(applySections()).toBe(0);
        expect(expanded(tags)).toBe("true");
    });

    test("hides the header buttons until hover, as a switch", () => {
        startPlugin(SidebarSections);
        expect(hoverCss()).toContain(".sidebar-section:hover");
        settings.store.headerHover = false;
        expect(hoverCss()).toBeNull();
        stopPlugin(SidebarSections);
        expect(hoverCss()).toBeNull();
    });
});
