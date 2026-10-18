/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { closeAllDialogs, openDialog } from "../src/api/Dialog";

const overlays = () => [...document.querySelectorAll<HTMLElement>(".ldpp-dialog-overlay")];
const button = (root: HTMLElement, title: string) => [...root.querySelectorAll<HTMLButtonElement>(".ldpp-dialog-header button")].find(item => item.title === title);

describe("dialog stack", () => {
    afterEach(() => {
        closeAllDialogs();
        document.body.innerHTML = "";
    });

    test("a large dialog over a large dialog hides the one underneath until it closes", () => {
        openDialog({ title: "LD++ 设置", size: "large", body: "list" });
        const plugin = openDialog({ title: "话题屏蔽", size: "large", back: "返回设置", body: "settings" });
        const [settings, top] = overlays();
        expect(settings.classList.contains("is-covered")).toBe(true);
        expect(top.classList.contains("is-covered")).toBe(false);
        plugin.close();
        expect(settings.classList.contains("is-covered")).toBe(false);
    });

    test("a small confirmation over a large dialog leaves it visible", () => {
        openDialog({ title: "话题屏蔽", size: "large", body: "settings" });
        openDialog({ title: "重置设置", size: "small", body: "确定？" });
        expect(overlays()[0].classList.contains("is-covered")).toBe(false);
    });

    test("‹ returns to the dialog underneath; × closes both", () => {
        openDialog({ title: "LD++ 设置", size: "large", body: "list" });
        const plugin = openDialog({ title: "话题屏蔽", size: "large", back: "返回设置", body: "settings" });
        button(plugin.root, "返回设置")?.click();
        expect(overlays().length).toBe(1);

        const again = openDialog({ title: "话题屏蔽", size: "large", back: "返回设置", body: "settings" });
        button(again.root, "关闭")?.click();
        expect(overlays().length).toBe(0);
    });

    test("without `back`, × closes only its own dialog", () => {
        openDialog({ title: "LD++ 设置", size: "large", body: "list" });
        const confirm = openDialog({ title: "重置设置", size: "small", body: "确定？" });
        expect(button(confirm.root, "返回设置")).toBeUndefined();
        button(confirm.root, "关闭")?.click();
        expect(overlays().length).toBe(1);
    });
});
