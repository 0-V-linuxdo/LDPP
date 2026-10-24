/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { configureToasts, showToast, type ToastType } from "../src/api/Notifications";

describe("showToast", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    test("clicking a clickable toast runs onClick and closes it, without counting as a dismiss", () => {
        let clicks = 0;
        let dismissed = 0;
        const handle = showToast("正在生成总结…", "loading", { key: "summary:1", onClick: () => { clicks++; }, onDismiss: () => dismissed++ });
        document.querySelector<HTMLElement>(".ldpp-toast")!.click();
        expect(clicks).toBe(1);
        expect(dismissed).toBe(0);
        expect(handle.closed).toBe(true);
        // A later progress update goes nowhere, and the key is free for a new toast.
        handle.update("总结完成", "success");
        expect(showToast("x", "info", { key: "summary:1" })).not.toBe(handle);
    });

    test("the close button dismisses without running onClick", () => {
        let clicks = 0;
        let dismissed = 0;
        const handle = showToast("失败", "error", { onClick: () => { clicks++; }, onDismiss: () => dismissed++ });
        document.querySelector<HTMLElement>(".ldpp-toast-close")!.click();
        expect(clicks).toBe(0);
        expect(dismissed).toBe(1);
        expect(handle.closed).toBe(true);
    });

    test("onClick gets the current type, and returning false keeps the toast open", () => {
        const seen: ToastType[] = [];
        const handle = showToast("正在生成总结…", "loading", { onClick: type => { seen.push(type); return false; } });
        handle.update("总结失败", "error");
        document.querySelector<HTMLElement>(".ldpp-toast")!.click();
        expect(seen).toEqual(["error"]);
        expect(handle.closed).toBe(false);
    });

    test("the original script's look is a class on the container", () => {
        configureToasts(() => ({ enabled: true, durations: { info: 3, success: 4, warning: 6, error: 0 }, style: "classic", summaryPreview: true, keepSummary: false }));
        showToast("x", "info");
        expect(document.querySelector(".ldpp-toasts")?.classList.contains("ldpp-toasts-classic")).toBe(true);
        configureToasts(() => ({ enabled: true, durations: { info: 3, success: 4, warning: 6, error: 0 }, style: "ldpp", summaryPreview: true, keepSummary: false }));
    });

    test("a detail line shows under the message, and goes away when cleared", () => {
        const handle = showToast("总结完成", "success");
        const detail = () => document.querySelectorAll<HTMLElement>(".ldpp-toast-detail");
        const last = () => detail()[detail().length - 1];
        expect(last().hidden).toBe(true);
        handle.setDetail("要点一 要点二");
        expect(last().hidden).toBe(false);
        expect(last().textContent).toBe("要点一 要点二");
        handle.setDetail(null);
        expect(last().hidden).toBe(true);
    });
});
