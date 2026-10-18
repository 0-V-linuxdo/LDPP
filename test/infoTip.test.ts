/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { InfoTip } from "../src/components/controls";

describe("InfoTip", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    test("is a single inline icon button; the text is not in the layout until opened", () => {
        const host = document.createElement("h3");
        host.append("导入", InfoTip("支持旧版脚本导出的配置。"));
        document.body.append(host);
        expect(host.children.length).toBe(1);
        expect(host.textContent).toBe("导入");
        expect(document.querySelector(".ldpp-infotip-pop")).toBeNull();
    });

    test("click opens a floating popover on body; a second click, Escape or an outside click closes it", () => {
        const tip = InfoTip("勾选要删除的规则。");
        document.body.append(tip);
        tip.click();
        const pop = document.querySelector<HTMLElement>(".ldpp-infotip-pop");
        expect(pop?.parentElement).toBe(document.body);
        expect(pop?.textContent).toBe("勾选要删除的规则。");
        expect(tip.getAttribute("aria-expanded")).toBe("true");
        tip.click();
        expect(document.querySelector(".ldpp-infotip-pop")).toBeNull();

        tip.click();
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        expect(document.querySelector(".ldpp-infotip-pop")).toBeNull();

        tip.click();
        document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        expect(document.querySelector(".ldpp-infotip-pop")).toBeNull();
        expect(tip.getAttribute("aria-expanded")).toBe("false");
    });

    test("warnings use their own label and class", () => {
        const tip = InfoTip("不要同时启用旧脚本。", { label: "注意", warning: true });
        expect(tip.classList.contains("is-warning")).toBe(true);
        expect(tip.getAttribute("aria-label")).toBe("注意");
    });
});
