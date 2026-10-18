/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { isPluginEnabled, registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import SidebarWidth, { clampWidth, DEFAULT_WIDTH, handleHeight, LEGACY_KEY, MIN_MAIN, MIN_WIDTH, parseLegacyWidth, settings } from "../src/plugins/sidebarWidth";

const layoutCss = () => document.querySelector<HTMLStyleElement>('style[data-ldpp-style="sidebarWidth-layout"]')?.textContent ?? null;

describe("sidebar width helpers", () => {
    test("reads the old userscript's saved width and ignores unusable values", () => {
        expect(parseLegacyWidth("312px")).toBe(312);
        expect(parseLegacyWidth("250")).toBe(250);
        expect(parseLegacyWidth("40px")).toBeNull();
        expect(parseLegacyWidth("abc")).toBeNull();
        expect(parseLegacyWidth(null)).toBeNull();
        expect(parseLegacyWidth("2000px")).toBe(600);
    });

    test("a dragged width stays above the minimum and leaves room for the topic list", () => {
        expect(clampWidth(350, 1000)).toBe(350);
        expect(clampWidth(20, 1000)).toBe(MIN_WIDTH);
        expect(clampWidth(990, 1000)).toBe(1000 - MIN_MAIN);
        expect(clampWidth(300, 250)).toBe(MIN_WIDTH);
    });

    test("the drag handle covers the top third of the sidebar by default, the whole edge when that is off", () => {
        expect(settings.def.topThird.default).toBe(true);
        expect(handleHeight(1009, true)).toBe(336);
        expect(handleHeight(1009, false)).toBe(1009);
    });
});

describe("SidebarWidth plugin", () => {
    beforeAll(() => registerPlugin(SidebarWidth));
    afterEach(() => {
        stopPlugin(SidebarWidth);
        localStorage.removeItem(LEGACY_KEY);
        settings.reset("width");
        settings.store.legacyImported = false;
    });

    test("is on by default and only overrides Discourse's sidebar-width variable", () => {
        expect(isPluginEnabled("SidebarWidth")).toBe(true);
        startPlugin(SidebarWidth);
        expect(layoutCss()).toBe(`body:not(.mobile-view) #main-outlet-wrapper { --d-sidebar-width: ${DEFAULT_WIDTH}px !important; }`);
        expect(document.querySelector(".ldpp-sidebar-width-handle")).not.toBeNull();
    });

    test("adopts the old userscript's width once", () => {
        localStorage.setItem(LEGACY_KEY, "320px");
        startPlugin(SidebarWidth);
        expect(settings.store.width).toBe(320);
        expect(layoutCss()).toContain("--d-sidebar-width: 320px");
        stopPlugin(SidebarWidth);
        localStorage.setItem(LEGACY_KEY, "500px");
        startPlugin(SidebarWidth);
        expect(settings.store.width).toBe(320);
    });

    test("turning it off removes the override and the handle", () => {
        startPlugin(SidebarWidth);
        stopPlugin(SidebarWidth);
        expect(layoutCss()).toBeNull();
        expect(document.querySelector(".ldpp-sidebar-width-handle")).toBeNull();
    });
});
