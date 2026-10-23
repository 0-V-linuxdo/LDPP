/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { closeAllDialogs } from "../src/api/Dialog";
import { plugins, registerPlugin } from "../src/api/PluginManager";
import Settings, { openSettings } from "../src/plugins/_core/settings";
import definePlugin from "../src/utils/types";

const DAY = 24 * 60 * 60 * 1000;

function fake(name: string, updatedAt: number) {
    registerPlugin(definePlugin({ name, displayName: name, description: name, tags: ["reading"] }));
    plugins[name].updatedAt = updatedAt;
}

describe("功能页的分类", () => {
    fake("TabOld", Date.now() - 30 * DAY);
    fake("TabFresh", Date.now() - DAY);
    fake("TabFresher", Date.now() - 60_000);
    registerPlugin(definePlugin({ name: "TabRequired", displayName: "AAA 必需", description: "", required: true }));
    registerPlugin(Settings as never);
    Settings.start!();
    afterEach(() => {
        closeAllDialogs();
        document.body.innerHTML = "";
    });

    const root = () => document.querySelector(".ldpp-settings")!;
    const tab = (label: string) => Array.from(root().querySelectorAll<HTMLButtonElement>(".ldpp-plugins-tab")).find(b => b.textContent === label)!;
    const names = () => Array.from(root().querySelectorAll<HTMLElement>(".ldpp-plugin-card"), card => card.dataset.plugin);

    test("「最新」 sits between 收藏 and 全部 and lists last week's updates newest first", () => {
        openSettings();
        expect(Array.from(root().querySelectorAll(".ldpp-plugins-tab"), b => b.textContent).slice(0, 3)).toEqual(["收藏", "最新", "全部"]);
        tab("最新").click();
        expect(names()).toEqual(["TabFresher", "TabFresh"]);
        expect(root().querySelector<HTMLInputElement>(".ldpp-plugins-search")!.placeholder).toBe("搜索 2 个功能…");
    });

    test("plugins seen for the first time get the 「新」 badge", () => {
        openSettings();
        tab("全部").click();
        expect(root().querySelector('.ldpp-plugin-card[data-plugin="TabOld"] .ldpp-plugin-card-new')?.textContent).toBe("新");
    });

    test("「全部」 lists required plugins last, below a separator, with the switch locked and no pin", () => {
        openSettings();
        tab("全部").click();
        expect(names().at(-1)).toBe("TabRequired");
        const card = root().querySelector('.ldpp-plugin-card[data-plugin="TabRequired"]')!;
        expect(card.previousElementSibling?.classList.contains("ldpp-plugins-separator")).toBe(true);
        expect(card.querySelector<HTMLInputElement>("input[type=checkbox]")!.disabled).toBe(true);
        expect(card.querySelector(".ldpp-plugin-pin")).toBeNull();
        expect(card.querySelector(".ldpp-plugin-card-required")).not.toBeNull();
    });
});
