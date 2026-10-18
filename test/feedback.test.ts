/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { flashFeedback } from "../src/components/controls";

describe("click feedback", () => {
    test("success draws the Discourse check mark and a success label", () => {
        const button = document.createElement("button");
        flashFeedback(button, true, "已复制");
        expect(button.classList.contains("is-feedback-active")).toBe(true);
        expect(button.querySelector(".ldpp-feedback-svg path")?.getAttribute("d")).toBe("M13 26 l10 10 20 -20");
        expect(button.querySelector(".ldpp-feedback-alert.is-success")?.textContent).toBe("已复制");
    });

    test("failure shows only a failure label, and repeated clicks never stack marks", () => {
        const button = document.createElement("button");
        flashFeedback(button, true, "已复制");
        flashFeedback(button, false, "复制失败");
        expect(button.querySelectorAll(".ldpp-feedback-svg").length).toBe(0);
        expect(button.querySelectorAll(".ldpp-feedback-alert").length).toBe(1);
        expect(button.querySelector(".ldpp-feedback-alert")?.classList.contains("is-fail")).toBe(true);
    });
});
