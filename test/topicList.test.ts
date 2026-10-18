/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { beforeEach, describe, expect, test } from "bun:test";

import { cachedTopicTitle } from "../src/api/Discourse";
import { flushNow, getPanelRow, getRows, registerDecorator, registerFilter, setRevealHidden, setTitleMark, setTitleOverride, setTitlePreview, unregisterDecorator, unregisterFilter } from "../src/api/TopicList";

function row(id: string, title: string, category = "开发调优", tags: string[] = []) {
    const tagHtml = tags.map(tag => `<li><a class="discourse-tag" data-tag-name="${tag}">${tag}</a></li>`).join("");
    return `<tr class="topic-list-item" data-topic-id="${id}"><td class="main-link"><span class="link-top-line"><a class="title raw-link raw-topic-link" href="/t/topic/${id}"><span dir="auto">${title}</span></a></span><div class="link-bottom-line"><a class="badge-category__wrapper"><span class="badge-category__name">${category}</span></a><ul class="discourse-tags">${tagHtml}</ul></div></td><td>1</td></tr>`;
}

function mount(html: string) {
    document.body.innerHTML = `<div id="main-outlet"><table class="topic-list"><tbody>${html}</tbody></table></div>`;
}

const titleOf = (id: string) => document.querySelector(`tr[data-topic-id="${id}"] a.title`)?.textContent?.trim();

describe("TopicList pipeline", () => {
    beforeEach(() => {
        unregisterFilter("test");
        unregisterDecorator("test");
        setTitleOverride("1", null);
        setTitleOverride("2", null);
        setRevealHidden(false);
    });

    test("extracts original title, category and tags", () => {
        mount(row("1", "震惊！某个工具", "搞七捻三", ["纯水", "AI"]));
        flushNow();
        const [first] = getRows();
        expect(first.originalTitle).toBe("震惊！某个工具");
        expect(first.category).toBe("搞七捻三");
        expect(first.tags).toEqual(["纯水", "AI"]);
    });

    test("filters see the original title even after a display override", () => {
        mount(row("1", "震惊！某个工具") + row("2", "普通标题"));
        registerFilter({ id: "test", test: r => r.originalTitle.includes("改写") ? "hit" : null });
        setTitleOverride("1", "改写后的具体标题");
        flushNow();
        expect(titleOf("1")).toBe("改写后的具体标题");
        flushNow();
        flushNow();
        const rows = getRows();
        expect(rows.find(r => r.id === "1")?.originalTitle).toBe("震惊！某个工具");
        expect(rows.every(r => !r.hidden)).toBe(true);
        expect(document.querySelectorAll(".ldpp-hidden").length).toBe(0);
    });

    test("hidden rows keep a stable state across repeated passes", async () => {
        mount(row("1", "广告：限时优惠") + row("2", "正常讨论"));
        registerFilter({ id: "test", test: r => r.originalTitle.includes("广告") ? ["ad"] : null });
        setTitleOverride("1", "改写的标题不含关键词");
        flushNow();
        let writes = 0;
        const observer = new MutationObserver(records => { writes += records.length; });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true });
        for (let i = 0; i < 5; i++) flushNow();
        await new Promise(resolve => setTimeout(resolve, 0));
        observer.disconnect();
        expect(writes).toBe(0);
        expect(document.querySelector("tr[data-topic-id='1']")?.classList.contains("ldpp-hidden")).toBe(true);
    });

    test("reveal mode swaps hidden for revealed without touching filters", () => {
        mount(row("1", "广告") + row("2", "正常"));
        registerFilter({ id: "test", test: r => r.originalTitle === "广告" ? 1 : null });
        flushNow();
        setRevealHidden(true);
        const el = document.querySelector("tr[data-topic-id='1']")!;
        expect(el.classList.contains("ldpp-hidden")).toBe(false);
        expect(el.classList.contains("ldpp-revealed")).toBe(true);
        expect(getRows().find(r => r.id === "1")?.hidden).toBe(true);
    });

    test("preview restores the original text temporarily", () => {
        mount(row("1", "原标题"));
        setTitleOverride("1", "新标题");
        flushNow();
        setTitlePreview("1", true);
        expect(titleOf("1")).toBe("原标题");
        setTitlePreview("1", false);
        expect(titleOf("1")).toBe("新标题");
        setTitleOverride("1", null);
        expect(titleOf("1")).toBe("原标题");
    });

    test("a real title change from the site resets the original title", () => {
        mount(row("1", "旧标题"));
        setTitleOverride("1", "改写");
        flushNow();
        const span = document.querySelector("tr[data-topic-id='1'] a.title span")!;
        span.textContent = "站点修改后的标题";
        flushNow();
        expect(getRows()[0].originalTitle).toBe("站点修改后的标题");
    });

    test("decorators render into ordered slots and panels follow their row", () => {
        mount(row("1", "A") + row("2", "B"));
        registerDecorator({ id: "test", order: 5, render: (r, slot) => { if (!slot.firstChild) slot.append(`btn-${r.id}`); } });
        flushNow();
        expect(document.querySelectorAll(".ldpp-actions [data-slot='test']").length).toBe(2);
        const first = getRows()[0];
        const panel = getPanelRow(first, true);
        expect(panel?.closest("tr")?.previousElementSibling).toBe(first.el);
        expect(getPanelRow(first, true)).toBe(panel);
        first.el.remove();
        flushNow();
        expect(document.querySelectorAll("tr.ldpp-panel-row").length).toBe(0);
    });

    test("title marks are applied once, follow re-rendered titles and can be cleared", () => {
        mount(row("41", "震惊！这件事"));
        flushNow();
        setTitleMark("41", "clickbait");
        const holder = () => document.querySelector('tr[data-topic-id="41"] a.title span[dir]') as HTMLElement;
        expect(holder().classList.contains("ldpp-title-mark-clickbait")).toBe(true);
        flushNow();
        expect(holder().className).toBe("ldpp-title-mark-clickbait");
        holder().replaceWith(Object.assign(document.createElement("span"), { dir: "auto", textContent: "震惊！这件事" }));
        flushNow();
        expect(holder().classList.contains("ldpp-title-mark-clickbait")).toBe(true);
        setTitleMark("41", null);
        expect(holder().classList.contains("ldpp-title-mark-clickbait")).toBe(false);
    });

    test("rows seed the topic title cache with the original title", () => {
        mount(row("31", "原始标题"));
        flushNow();
        setTitleOverride("31", "改写标题");
        flushNow();
        expect(titleOf("31")).toBe("改写标题");
        expect(cachedTopicTitle("31")).toBe("原始标题");
        setTitleOverride("31", null);
    });
});
