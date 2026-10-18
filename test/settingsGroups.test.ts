/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { definePluginSettings } from "../src/api/Settings";
import { TextInput } from "../src/components/controls";
import { renderSettingsForm } from "../src/plugins/_core/settings/form";
import { OptionType, type Plugin } from "../src/utils/types";

describe("grouped long settings", () => {
    test("consecutive settings with the same group become one tabbed block showing one text at a time", () => {
        const settings = definePluginSettings({
            auto: { type: OptionType.BOOLEAN, description: "自动", default: true },
            judge: { type: OptionType.STRING, description: "判断提示词", group: "提示词", tab: "判断", multiline: true, default: "A\nB" },
            rewrite: { type: OptionType.STRING, description: "改写提示词", group: "提示词", tab: "改写", multiline: true, default: "C" },
        });
        settings.pluginName = "GroupTest";
        const plugin = { name: "GroupTest", displayName: "测试", description: "", settings, started: false } as Plugin;
        const form = renderSettingsForm(plugin)!;
        const group = form.querySelector(".ldpp-settings-group")!;
        expect(group.querySelector(".ldpp-field-label")?.textContent).toBe("提示词");
        expect(Array.from(group.querySelectorAll(".ldpp-subtab"), b => b.textContent)).toEqual(["判断", "改写"]);
        expect(group.querySelectorAll("textarea").length).toBe(1);
        expect(group.querySelector("textarea")?.value).toBe("A\nB");
        group.querySelectorAll<HTMLButtonElement>(".ldpp-subtab")[1].click();
        expect(group.querySelector("textarea")?.value).toBe("C");
        expect(form.querySelectorAll("textarea").length).toBe(1);
    });

    test("multi-line inputs start at 2 rows so one-line values are not shown in a 4-line box", () => {
        const area = TextInput({ value: "```", multiline: true }) as HTMLTextAreaElement;
        expect(Number(area.rows)).toBe(2);
    });
});
