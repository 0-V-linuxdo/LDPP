/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { showToast } from "../src/api/Notifications";

describe("showToast", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    test("clicking a clickable toast runs onClick and closes it, without counting as a dismiss", () => {
        let clicks = 0;
        let dismissed = 0;
        const handle = showToast("正在生成总结…", "loading", { key: "summary:1", onClick: () => clicks++, onDismiss: () => dismissed++ });
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
        const handle = showToast("失败", "error", { onClick: () => clicks++, onDismiss: () => dismissed++ });
        document.querySelector<HTMLElement>(".ldpp-toast-close")!.click();
        expect(clicks).toBe(0);
        expect(dismissed).toBe(1);
        expect(handle.closed).toBe(true);
    });
});
