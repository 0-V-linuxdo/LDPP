/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { isPluginEnabled, registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import { convertLegacy, describeLegacy } from "../src/plugins/_core/settings/legacy";
import KeywordSearch, { importKeywordFile, linkLabel, normalizeKeywords, normalizeLinks, parseKeywordExport, resolveLink, searchPath, settings, toExport } from "../src/plugins/keywordSearch";

const BASE = "https://linux.do/latest";
const oldExport = {
    keywords: [
        { keyword: "Claude", filters: { sort: "relevance" } },
        { keyword: "提示词", filters: { sort: "latest" } },
        { keyword: "Claude", filters: { sort: "relevance" } },
    ],
    links: [{ label: "", url: "github.com/0-V-linuxdo" }, { label: "书签", url: "/my/activity/bookmarks" }],
};

describe("关键词搜索增强 data", () => {
    test("reads the old script's keywords in any of its shapes, one per keyword and order", () => {
        expect(normalizeKeywords(["o1", { keyword: "Claude", sort: "likes" }, { keyword: "Claude", filters: { sort: "likes" } }, { keyword: " ", sort: "latest" }, { keyword: "x", sort: "bogus" }]))
            .toEqual([{ keyword: "o1", sort: "relevance" }, { keyword: "Claude", sort: "likes" }, { keyword: "x", sort: "relevance" }]);
    });

    test("searches with the order as Discourse's order: token", () => {
        expect(searchPath({ keyword: "提示词", sort: "latest" })).toBe(`/search?q=${encodeURIComponent("提示词 order:latest")}`);
        expect(searchPath({ keyword: "o1 pro", sort: "relevance" })).toBe("/search?q=o1%20pro");
    });

    test("opens full addresses, bare domains, //hosts and site paths, never script URLs", () => {
        expect(resolveLink("github.com/x", BASE)).toBe("https://github.com/x");
        expect(resolveLink("//example.com/a", BASE)).toBe("https://example.com/a");
        expect(resolveLink("/my/activity", BASE)).toBe("https://linux.do/my/activity");
        expect(resolveLink("javascript:alert(1)", BASE)).toBe("");
        expect(linkLabel({ label: "", url: "github.com/0-V-linuxdo/" }, BASE)).toBe("github.com/0-V-linuxdo");
        expect(normalizeLinks(["a.com", { title: "A", href: "https://a.com/" }], BASE)).toEqual([{ label: "", url: "a.com" }]);
    });

    test("recognises the old export file and writes the same shape back", () => {
        const parsed = parseKeywordExport(oldExport)!;
        expect(parsed.keywords).toEqual([{ keyword: "Claude", sort: "relevance" }, { keyword: "提示词", sort: "latest" }]);
        expect(parsed.links).toHaveLength(2);
        expect(parseKeywordExport(["a", "b"])?.keywords).toHaveLength(2);
        expect(parseKeywordExport({ blockedTitles: ["x"] })).toBeNull();
        expect(parseKeywordExport([{ summary: "x" }])).toBeNull();
        expect(toExport(parsed.keywords!, parsed.links!)).toEqual({
            keywords: [{ keyword: "Claude", filters: { sort: "relevance" } }, { keyword: "提示词", filters: { sort: "latest" } }],
            links: [{ label: "", url: "github.com/0-V-linuxdo" }, { label: "书签", url: "/my/activity/bookmarks" }],
        });
    });
});

describe("关键词搜索增强 plugin", () => {
    beforeAll(() => registerPlugin(KeywordSearch));
    afterEach(() => {
        stopPlugin(KeywordSearch);
        settings.store.keywords = [];
        settings.store.links = [];
        document.body.innerHTML = "";
    });

    test("imports the old file by merging, and LD++'s data import recognises it too", () => {
        expect(isPluginEnabled("KeywordSearch")).toBe(true);
        settings.store.keywords = [{ keyword: "Claude", sort: "relevance" }];
        expect(importKeywordFile(oldExport)).toEqual({ keywords: 1, links: 2 });
        expect(importKeywordFile(oldExport)).toEqual({ keywords: 0, links: 0 });
        expect(describeLegacy(oldExport)).toBe("「Keywords Search Enhanced」导出文件");
        expect(convertLegacy(oldExport)?.settingsPatch?.KeywordSearch?.keywords).toHaveLength(2);
    });

    test("puts the 🏷️ in both search boxes and opens the panel with chips and order badges", () => {
        settings.store.keywords = [{ keyword: "提示词", sort: "latest" }];
        document.body.innerHTML = `<div class="search-input"><input><div class="searching"><button class="show-advanced-search"></button></div></div><div class="search-bar"><div class="search-bar__field"><input class="full-page-search"><a class="clear-search"></a></div></div>`;
        startPlugin(KeywordSearch);
        const toggles = document.querySelectorAll<HTMLButtonElement>(".ldpp-kws-toggle");
        expect(toggles).toHaveLength(2);
        expect(document.querySelector(".searching > .ldpp-kws-toggle + .show-advanced-search")).not.toBeNull();
        expect(document.querySelector(".search-bar__field > .ldpp-kws-toggle.is-in-field")).not.toBeNull();
        toggles[0].click();
        const panel = document.querySelector(".ldpp-kws-panel");
        expect(panel?.querySelector(".ldpp-kws-chip-text")?.textContent).toBe("🔍 提示词");
        expect(panel?.querySelector(".ldpp-kws-badge")?.textContent).toBe("最新帖子");
        expect(toggles[0].getAttribute("aria-expanded")).toBe("true");
        stopPlugin(KeywordSearch);
        expect(document.querySelector(".ldpp-kws-panel, .ldpp-kws-toggle")).toBeNull();
    });
});
