/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { renderKeywordList } from "../src/plugins/topicBlocker/editor";

const words = (root: HTMLElement) => Array.from(root.querySelectorAll(".ldpp-keyword-text"), el => el.textContent);
const button = (root: HTMLElement, label: string) => Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(b => b.textContent === label)!;

function mount(initial: string[], order: "pinyin" | "added" = "added") {
    const saved: string[][] = [];
    let current = order;
    const root = renderKeywordList(initial, next => saved.push(next), { sort: { get: () => current, set: value => { current = value; } } });
    document.body.append(root);
    return { root, saved };
}

describe("keyword list editor", () => {
    afterEach(() => { document.body.innerHTML = ""; });

    test("shows every keyword as a grid cell with a count, not a 5-line textarea", () => {
        const { root } = mount(["女朋友", "杰士邦", "vpn", "黑神话", "水龙", "酒馆"]);
        expect(root.querySelector("textarea")).toBeNull();
        expect(words(root)).toEqual(["女朋友", "杰士邦", "vpn", "黑神话", "水龙", "酒馆"]);
        expect(root.querySelector(".ldpp-keywords-status")?.textContent).toBe("共 6 个");
    });

    test("search narrows the grid and highlights the match", () => {
        const { root } = mount(["Plus 会员", "plus", "team", "降智"]);
        const search = root.querySelector<HTMLInputElement>(".ldpp-keywords-search")!;
        search.value = "PLUS";
        search.dispatchEvent(new Event("input"));
        expect(words(root)).toEqual(["Plus 会员", "plus"]);
        expect(root.querySelector(".ldpp-keywords-status")?.textContent).toBe("匹配 2 / 4 个");
        expect(root.querySelector(".ldpp-keywords-hit")?.textContent).toBe("Plus");
    });

    test("adds several keywords at once and skips ones already present (case-insensitive)", () => {
        const { root, saved } = mount(["vpn"]);
        const box = root.querySelector<HTMLInputElement>(".ldpp-keywords-add")!;
        box.value = "VPN，机场, 梯子";
        button(root, "添加").click();
        expect(saved.at(-1)).toEqual(["vpn", "机场", "梯子"]);
        expect(words(root)).toEqual(["vpn", "机场", "梯子"]);
    });

    test("the × on a cell removes just that keyword", () => {
        const { root, saved } = mount(["a1", "b2", "c3"]);
        root.querySelectorAll<HTMLButtonElement>(".ldpp-keyword-remove")[1].click();
        expect(saved.at(-1)).toEqual(["a1", "c3"]);
    });

    test("bulk edit uses the old script's comma-separated text and saves it back", () => {
        const { root, saved } = mount(["a1", "b2"]);
        button(root, "批量编辑").click();
        const area = root.querySelector<HTMLTextAreaElement>(".ldpp-keywords-bulk")!;
        expect(area.value).toBe("a1, b2");
        area.value = "a1, b2, c3\nd4";
        button(root, "保存").click();
        expect(saved.at(-1)).toEqual(["a1", "b2", "c3", "d4"]);
        expect(root.querySelector(".ldpp-keywords-bulk")).toBeNull();
    });

    test("pinyin order groups Chinese and English under A–Z letter headings", () => {
        const { root } = mount(["女朋友", "vpn", "Adobe", "阿里", "黑神话", "2fa", "奥运会"], "pinyin");
        const letters = Array.from(root.querySelectorAll(".ldpp-keywords-letter"), el => el.textContent);
        expect(letters).toEqual(["#", "A", "H", "N", "V"]);
        expect(words(root)).toEqual(["2fa", "阿里", "奥运会", "Adobe", "黑神话", "女朋友", "vpn"]);
    });

    test("letter markers sit inside the flow and the A–Z bar lists the letters present", () => {
        const { root } = mount(["女朋友", "vpn", "Adobe", "阿里", "黑神话"], "pinyin");
        const grid = root.querySelector(".ldpp-keywords-grid")!;
        expect(Array.from(grid.children, el => el.className.includes("letter") ? `[${el.textContent}]` : el.getAttribute("title"))).toEqual(["[A]", "阿里", "Adobe", "[H]", "黑神话", "[N]", "女朋友", "[V]", "vpn"]);
        expect(Array.from(root.querySelectorAll(".ldpp-keywords-jump"), el => el.textContent)).toEqual(["A", "H", "N", "V"]);
        expect(root.querySelector<HTMLElement>(".ldpp-keywords-index")?.hidden).toBe(false);
    });

    test("the sort switch remembers the choice", () => {
        let stored = "pinyin" as "pinyin" | "added";
        const root = renderKeywordList(["女朋友", "Adobe"], () => {}, { sort: { get: () => stored, set: value => { stored = value; } } });
        const select = root.querySelector<HTMLSelectElement>(".ldpp-keywords-sort")!;
        select.value = "added";
        select.dispatchEvent(new Event("change"));
        expect(stored).toBe("added");
        expect(words(root)).toEqual(["女朋友", "Adobe"]);
        expect(root.querySelector(".ldpp-keywords-letter")).toBeNull();
    });
});
