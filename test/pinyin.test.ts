/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { pinyinInitial, sortByPinyin } from "../src/utils/pinyin";

describe("pinyin ordering", () => {
    test("initials: Han by pinyin, Latin by letter, anything else under #", () => {
        expect(["阿里", "吧", "二次元", "黑神话", "杰士邦", "女朋友", "三级", "一机难求", "Adobe", "vpn", "123", "【已无】"].map(pinyinInitial))
            .toEqual(["A", "B", "E", "H", "J", "N", "S", "Y", "A", "V", "#", "#"]);
    });

    test("every initial lands in its own group (R / S / T included)", () => {
        const samples: Record<string, string> = { 爱: "A", 擦: "C", 打: "D", 额: "E", 嘎: "G", 机: "J", 卡: "K", 乐: "L", 妈: "M", 哦: "O", 怕: "P", 七: "Q", 日: "R", 入: "R", 软: "R", 瑞: "R", 撒: "S", 水: "S", 他: "T", 挖: "W", 王: "W", 新: "X", 音: "Y", 再: "Z", 诈: "Z" };
        for (const [char, want] of Object.entries(samples)) expect(`${char}:${pinyinInitial(char)}`).toBe(`${char}:${want}`);
    });

    test("contact-list order: # first, then A–Z with Chinese and English mixed", () => {
        expect(sortByPinyin(["vpn", "女朋友", "Adobe", "阿里", "（已收）", "三级", "steam"]))
            .toEqual(["（已收）", "阿里", "Adobe", "女朋友", "三级", "steam", "vpn"]);
    });
});
