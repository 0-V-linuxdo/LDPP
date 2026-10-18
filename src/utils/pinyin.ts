/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Pinyin ordering without a dictionary: the browser's ICU "pinyin" collation orders Han characters by reading,
 * and the first character of each initial (阿 for A, 八 for B, …) marks where a letter's block starts.
 * ICU gives each character one reading, so polyphones use the common one (长 sorts as zhang).
 */
const collator = new Intl.Collator("zh-Hans-CN-u-co-pinyin", { sensitivity: "base", numeric: true });

// Common characters that open each initial's block. Checked against Chromium's ICU and Bun:
// rarer picks such as 扨 / 它 sort elsewhere in Chromium and put R / T words under S.
const BOUNDARIES: Array<[string, string]> = [
    ["A", "吖"], ["B", "八"], ["C", "嚓"], ["D", "咑"], ["E", "妸"], ["F", "发"], ["G", "旮"], ["H", "哈"],
    ["J", "丌"], ["K", "咔"], ["L", "垃"], ["M", "妈"], ["N", "拏"], ["O", "噢"], ["P", "妑"], ["Q", "七"],
    ["R", "呥"], ["S", "仨"], ["T", "他"], ["W", "屲"], ["X", "夕"], ["Y", "丫"], ["Z", "帀"],
];

const HAN = /\p{Script=Han}/u;

/** A–Z for words starting with a Latin letter or a Han character (by pinyin initial); "#" for everything else. */
export function pinyinInitial(text: string): string {
    const first = Array.from(text.trim())[0] ?? "";
    if (/^[a-z]$/i.test(first)) return first.toUpperCase();
    if (!HAN.test(first)) return "#";
    let letter = "#";
    for (const [initial, boundary] of BOUNDARIES) {
        if (collator.compare(first, boundary) < 0) break;
        letter = initial;
    }
    return letter;
}

const groupRank = (letter: string) => letter === "#" ? 0 : letter.charCodeAt(0);

/** Contact-list order: grouped by initial ("#" first, then A–Z), Chinese and English mixed within a group. */
export function sortByPinyin(values: readonly string[]): string[] {
    const keyed = values.map(value => ({ value, initial: pinyinInitial(value) }));
    keyed.sort((a, b) => groupRank(a.initial) - groupRank(b.initial) || collator.compare(a.value, b.value));
    return keyed.map(item => item.value);
}
