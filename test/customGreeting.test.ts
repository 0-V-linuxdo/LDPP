/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { isPluginEnabled, registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import CustomGreeting, { escapeForCssContent, greetingCss, parseGreetings, pickNextIndex, settings } from "../src/plugins/customGreeting";

const bannerCss = () => document.querySelector<HTMLStyleElement>('style[data-ldpp-style="customGreeting-banner"]')?.textContent ?? null;
const shown = () => bannerCss()?.match(/content: "((?:[^"\\]|\\.)*)"/)?.[1] ?? null;

describe("greeting text", () => {
    test("one greeting per line; a literal \\n is a line break; blank lines are dropped", () => {
        expect(parseGreetings("第一条\n\n  第二条\\n下一行  \n")).toEqual(["第一条", "第二条\n下一行"]);
        expect(parseGreetings("")).toEqual([]);
    });

    test("CSS content escaping keeps quotes, backslashes and line breaks intact", () => {
        expect(escapeForCssContent("say \"hi\"\\\nbye")).toBe("say \\\"hi\\\"\\\\\\A bye");
    });

    test("the banner keeps the original text in place and lays the greeting over it (the script's grid overlay)", () => {
        const css = greetingCss("你好", true);
        expect(css).toContain(".welcome-banner__title {\n    display: grid !important;");
        expect(css).toContain("grid-auto-rows: 0 !important;");
        expect(css).toContain("content: \"你好\";");
        expect(css).toContain("cursor: pointer !important;");
        expect(greetingCss("你好", false)).not.toContain("cursor: pointer");
    });
});

describe("rotation", () => {
    beforeAll(() => registerPlugin(CustomGreeting));
    afterEach(() => {
        stopPlugin(CustomGreeting);
        for (const key of ["mode", "order", "phrases", "greetIndex", "lastRandom"] as const) settings.reset(key);
        document.body.innerHTML = "";
    });

    test("sequential order walks the list and wraps; random never repeats the last greeting", () => {
        settings.store.greetIndex = -1;
        expect([1, 2, 3, 4].map(() => pickNextIndex(3, true))).toEqual([0, 1, 2, 0]);
        expect(pickNextIndex(3, false)).toBe(0);
        settings.store.order = "random";
        const rolls = [0.1, 0.1, 0.1, 0.9];
        settings.store.greetIndex = 0;
        expect(pickNextIndex(3, true, () => rolls.shift() ?? 0)).toBe(2);
    });

    test("is on by default and shows the next greeting on arriving at the home page", () => {
        expect(isPluginEnabled("CustomGreeting")).toBe(true);
        settings.store.phrases = "甲\n乙\n丙";
        startPlugin(CustomGreeting);
        expect(shown()).toBe("甲");
    });

    test("in click mode the title switches to the next greeting", () => {
        settings.store.mode = "manual";
        settings.store.phrases = "甲\n乙";
        document.body.innerHTML = `<div class="welcome-banner__title">Where possible begins</div>`;
        startPlugin(CustomGreeting);
        expect(shown()).toBe("甲");
        document.querySelector<HTMLElement>(".welcome-banner__title")!.click();
        expect(shown()).toBe("乙");
        expect(bannerCss()).toContain("cursor: pointer !important;");
    });

    test("an empty list shows the site's own text, and turning it off removes the override", () => {
        settings.store.phrases = "  \n ";
        startPlugin(CustomGreeting);
        expect(bannerCss()).toBeNull();
        settings.store.phrases = "甲";
        stopPlugin(CustomGreeting);
        expect(bannerCss()).toBeNull();
    });
});
