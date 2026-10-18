/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「修正错别字」: the model only names fragments and their corrections; the corrected title is put together here, under
// limits it cannot talk its way past. LLMs over-correct (they "improve" wording, add characters, swap slang for standard
// words), so a fix must quote the title exactly, occur in it once, change at most a few characters, and change more than
// case, width, spacing or punctuation. Titles go 20 to a request, which also tends to lower the edit rate.

import type { ChatMessage } from "@api/AI";
import type { TitleFix } from "@api/records";
import { asString, isObject } from "@utils/guards";

import { JUDGE_BATCH, type JudgeInput, unfence } from "./protocol";

export const FIX_BATCH = JUDGE_BATCH;
const MAX_FIXES = 4;
const MAX_FRAGMENT = 16;
const MAX_CHANGE = 3;

export const DEFAULT_FIX_PROMPT = [
    "你是中文技术论坛的标题校对员，只找出确定写错的字词，用最少的改动修正。",
    "要修正的：同音或近音的别字（以经→已经、因该→应该、在接再厉→再接再厉）、形近字（按装→安装、迫不急待→迫不及待）、明显多打或漏打的字，以及英文单词拼错（recieve→receive、Calude→Claude）。",
    "不要修改：网络用语、梗和有意的谐音（如 佬、蚌埠住了、栓Q）；人名、昵称、型号、版本号、代码、链接和缩写；大小写、标点、空格和繁简体；「的地得」、语序、措辞和口语化的说法。拿不准就不改。",
    "只返回严格 JSON：{\"results\":[{\"topicId\":\"…\",\"fixes\":[{\"from\":\"标题里的原片段\",\"to\":\"修正后的片段\"}]}]}。",
    "from 必须与标题原文一字不差，带上错字前后的一两个字，使它在这个标题里只出现一次；to 只改其中写错的字。",
    "没有错别字的标题不要放进 results；全都没有错别字时返回 {\"results\":[]}。",
].join("\n");

export function buildFixMessages(prompt: string, topics: JudgeInput[]): ChatMessage[] {
    return [
        { role: "system", content: prompt.trim() || DEFAULT_FIX_PROMPT },
        { role: "user", content: JSON.stringify(topics.slice(0, FIX_BATCH).map(topic => ({ topicId: topic.topicId, title: topic.title }))) },
    ];
}

/** The model's fixes per topic, unchecked; topics it left out have no typos. */
export function parseFixes(text: string): Map<string, unknown[]> {
    let parsed: unknown;
    try {
        parsed = JSON.parse(unfence(text));
    } catch (error) {
        throw new Error(`错别字结果不是有效 JSON：${(error as Error).message}`, { cause: error });
    }
    const list = Array.isArray(parsed) ? parsed : isObject(parsed) ? parsed.results ?? parsed.topics : null;
    if (!Array.isArray(list)) throw new Error("错别字结果缺少 results 数组");
    const out = new Map<string, unknown[]>();
    for (const item of list) {
        if (!isObject(item)) continue;
        const topicId = asString(item.topicId ?? item.topic_id ?? item.id);
        const fixes = item.fixes ?? item.corrections ?? item.edits;
        if (topicId && Array.isArray(fixes) && !out.has(topicId)) out.set(topicId, fixes);
    }
    return out;
}

/** What differs between `from` and `to` once their common start and end are set aside; start / end are UTF-16 offsets in `to`. */
export function changedPart(from: string, to: string): { removed: string; inserted: string; start: number; end: number } {
    const a = Array.from(from);
    const b = Array.from(to);
    let head = 0;
    while (head < a.length && head < b.length && a[head] === b[head]) head++;
    let tail = 0;
    while (tail < a.length - head && tail < b.length - head && a[a.length - 1 - tail] === b[b.length - 1 - tail]) tail++;
    return {
        removed: a.slice(head, a.length - tail).join(""),
        inserted: b.slice(head, b.length - tail).join(""),
        start: b.slice(0, head).join("").length,
        end: to.length - b.slice(b.length - tail).join("").length,
    };
}

/** The part of the corrected fragment to underline: the changed characters, or the whole fragment for a pure deletion. */
export function fixMark(fix: TitleFix): [number, number] {
    const { start, end } = changedPart(fix.from, fix.to);
    return end > start ? [start, end] : [0, fix.to.length];
}

const squash = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
const length = (value: string) => Array.from(value).length;

/** The fixes that are safe to show, in title order; anything that looks like rewording rather than a typo is dropped. */
export function acceptFixes(title: string, raw: unknown): TitleFix[] {
    if (!Array.isArray(raw) || !raw.length || raw.length > MAX_FIXES) return [];
    let budget = Math.max(MAX_CHANGE, Math.ceil(length(title) / 4));
    const taken: Array<{ at: number; fix: TitleFix }> = [];
    for (const item of raw) {
        if (!isObject(item)) continue;
        const from = asString(item.from ?? item.wrong ?? item.original);
        const to = asString(item.to ?? item.right ?? item.corrected);
        if (!from || !to || from === to || /[\r\n\t]/.test(from + to)) continue;
        if (length(from) > MAX_FRAGMENT || length(to) > MAX_FRAGMENT) continue;
        const at = title.indexOf(from);
        if (at < 0 || title.includes(from, at + 1)) continue;
        if (taken.some(hit => at < hit.at + hit.fix.from.length && hit.at < at + from.length)) continue;
        if (squash(from) === squash(to)) continue;
        const { removed, inserted } = changedPart(from, to);
        const cost = Math.max(length(removed), length(inserted));
        if (cost > MAX_CHANGE || cost > budget) continue;
        budget -= cost;
        taken.push({ at, fix: { from, to } });
    }
    return taken.toSorted((x, y) => x.at - y.at).map(hit => hit.fix);
}

export const describeFixes = (fixes: readonly TitleFix[]) => fixes.map(fix => `${fix.from}→${fix.to}`).join("、");
