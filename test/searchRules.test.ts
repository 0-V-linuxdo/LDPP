/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { renderSearchRulesManager } from "../src/plugins/searchFilter/manager";
import type { SearchRule } from "../src/plugins/searchFilter/query";
import { renderRegexList } from "../src/plugins/topicBlocker/editor";

function store(initial: Record<string, SearchRule>) {
    const data = structuredClone(initial);
    const empty = (rule: SearchRule) => !rule.blacklist.length && !rule.whitelist.length && !rule.regex.length;
    return {
        data,
        all: () => structuredClone(data),
        get: (term: string) => structuredClone(data[term] ?? { blacklist: [], whitelist: [], regex: [] }),
        set: (term: string, rule: SearchRule) => { if (empty(rule)) delete data[term]; else data[term] = structuredClone(rule); },
    };
}

describe("search rules manager", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    test("lists every search term with its rule count and shows the chosen term's words as chips", () => {
        const s = store({ "#trade": { blacklist: ["spotify", "茅台", "出u"], whitelist: [], regex: [] }, "pro20": { blacklist: [], whitelist: ["pro"], regex: [] } });
        const root = renderSearchRulesManager(s);
        document.body.append(root);
        expect(Array.from(root.querySelectorAll(".ldpp-search-rules-term option"), o => o.textContent)).toEqual(["#trade（3）", "pro20（1）"]);
        expect(root.querySelectorAll(".ldpp-keyword").length).toBe(3);
    });

    test("editing a term's words saves to that term and updates its count", () => {
        const s = store({ "#trade": { blacklist: ["spotify", "茅台"], whitelist: [], regex: [] } });
        const root = renderSearchRulesManager(s);
        document.body.append(root);
        root.querySelector<HTMLButtonElement>(".ldpp-keyword-remove")!.click();
        expect(s.data["#trade"].blacklist.length).toBe(1);
        expect(root.querySelector(".ldpp-search-rules-term option")?.textContent).toBe("#trade（1）");
    });

    test("with no rules it says where to add them", () => {
        const root = renderSearchRulesManager(store({}));
        expect(root.textContent).toContain("还没有搜索词规则");
    });
});

describe("regex list", () => {
    test("patterns are wrapping text boxes (not cut-off single-line inputs) and Enter does not add a line", () => {
        const root = renderRegexList([{ pattern: ".*?已((.*?)耗尽|无|跑路|(.*?)用完|(.*?)刷完|(.*?)删|售罄).*", note: "抽奖" }], () => {});
        const pattern = root.querySelector<HTMLTextAreaElement>("textarea.ldpp-regex-pattern")!;
        expect(pattern.value).toContain("售罄");
        const enter = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
        pattern.dispatchEvent(enter);
        expect(enter.defaultPrevented).toBe(true);
    });

    test("search-term regexes can hide the note column", () => {
        const root = renderRegexList([{ pattern: "a+", note: "" }], () => {}, { notes: false });
        expect(root.classList.contains("no-notes")).toBe(true);
        expect(root.querySelectorAll(".ldpp-regex-row input, .ldpp-regex-row textarea").length).toBe(1);
    });
});
