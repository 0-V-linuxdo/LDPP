/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { Summaries } from "../src/api/DataStore";
import { createSummaryView } from "../src/plugins/topicSummary/view";

const record = { summary: "**要点**", timestamp: "2026-10-07T00:39:41Z", model: "gpt-5.6-terra", renderMode: "markdown" as const };

describe("summary view layout", () => {
    afterEach(() => {
        Summaries.set("901", undefined);
        document.body.innerHTML = "";
    });

    test("in the list panel the time and model end the actions row; in the sidebar they stay under the summary", () => {
        Summaries.set("901", [record]);
        const list = createSummaryView("901", { variant: "list", onAsk: () => {} });
        const meta = list.toolbar.querySelector(".ldpp-sv-meta");
        expect(meta?.textContent).toContain("gpt-5.6-terra");
        expect(meta?.getAttribute("title")).toBe(meta?.textContent ?? "");
        expect(list.el.querySelector(".ldpp-sv-body .ldpp-sv-meta")).toBeNull();
        expect(list.toolbar.querySelectorAll(".ldpp-icon-btn")).toHaveLength(3);

        const sidebar = createSummaryView("901", { variant: "sidebar" });
        expect(sidebar.toolbar.querySelector(".ldpp-sv-meta")).toBeNull();
        expect(sidebar.el.querySelector(".ldpp-sv-body .ldpp-sv-meta")?.textContent).toContain("gpt-5.6-terra");
        list.destroy();
        sidebar.destroy();
    });

    test("the toolbar keeps updating after the list panel moves it into its title row", () => {
        const view = createSummaryView("901", { variant: "list" });
        const head = document.body.appendChild(document.createElement("div"));
        document.body.appendChild(view.el);
        head.appendChild(view.toolbar);
        expect(view.toolbar.textContent).toContain("生成总结");
        Summaries.set("901", [record]);
        expect(view.toolbar.parentElement).toBe(head);
        expect(view.toolbar.textContent).not.toContain("生成总结");
        expect(view.toolbar.querySelector(".ldpp-sv-meta")?.textContent).toContain("gpt-5.6-terra");
        view.destroy();
    });
});
