/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { addQuestion, Questions } from "../src/api/DataStore";
import { registerPlugin } from "../src/api/PluginManager";
import TopicQA, { createQAPanel } from "../src/plugins/topicQA";

const record = (question: string, minutes: number) => ({
    id: `qa-${minutes}`,
    question,
    answer: `答：${question}`,
    presetId: "",
    presetName: "",
    timestamp: new Date(2026, 9, 5, 12, minutes).toISOString(),
    model: "test-model",
});

describe("提问 panel", () => {
    beforeAll(() => registerPlugin(TopicQA));
    afterEach(() => {
        Questions.set("42", []);
        document.body.innerHTML = "";
    });

    test("has no heading of its own; the composer (chips, then the box with its send button) comes after the thread", () => {
        const panel = createQAPanel("42");
        document.body.append(panel.el);
        expect(panel.el.querySelector(".ldpp-qa-head")).toBeNull();
        expect([...panel.el.children].map(child => child.className)).toEqual(["ldpp-qa-thread", "ldpp-qa-composer"]);
        expect([...panel.el.querySelectorAll(".ldpp-qa-chip")].map(chip => chip.textContent)).toEqual(["是否解决", "最佳方案"]);
        expect(panel.el.querySelector(".ldpp-qa-box .ldpp-qa-send")).not.toBeNull();
        expect(panel.el.querySelector(".ldpp-qa-empty")).not.toBeNull();
        panel.destroy();
    });

    test("a chip fills the box, and send is only enabled with a question in it", () => {
        const panel = createQAPanel("42");
        document.body.append(panel.el);
        const send = panel.el.querySelector<HTMLButtonElement>(".ldpp-qa-send")!;
        const input = panel.el.querySelector<HTMLTextAreaElement>(".ldpp-qa-input")!;
        expect(send.disabled).toBe(true);
        panel.el.querySelector<HTMLButtonElement>(".ldpp-qa-chip")!.click();
        expect(input.value).toContain("解决了吗");
        expect(send.disabled).toBe(false);
        panel.destroy();
    });

    test("shows the conversation oldest first, so the latest answer sits above the composer", () => {
        addQuestion("42", record("第一个问题", 1));
        addQuestion("42", record("第二个问题", 2));
        const panel = createQAPanel("42", { variant: "list" });
        document.body.append(panel.el);
        expect(panel.el.classList.contains("ldpp-qa-list")).toBe(true);
        expect([...panel.el.querySelectorAll(".ldpp-qa-q")].map(q => q.textContent)).toEqual(["第一个问题", "第二个问题"]);
        expect(panel.el.querySelectorAll(".ldpp-qa-meta .ldpp-icon-btn")).toHaveLength(2);
        panel.destroy();
    });
});
