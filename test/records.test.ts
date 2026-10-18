/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { mergeDeArrowMaps, mergeDeArrowState, mergeQA, mergeSummaries, normalizeDeArrow, normalizeSummary, normalizeSummaryList } from "../src/api/records";
import { checkScope, compileScope, scopeMatches } from "../src/plugins/deArrow/scope";
import { buildJudgeMessages, parseJudge, parseRewrite } from "../src/plugins/deArrow/protocol";

describe("summary records", () => {
    test("normalizes, infers render mode and sorts newest first", () => {
        const list = normalizeSummaryList([
            { summary: "### 标题\n- 点", timestamp: "2026-01-01T00:00:00Z", model: "a" },
            { summary: "<h3>x</h3>", timestamp: "2026-02-01T00:00:00Z" },
            { summary: "   " },
        ]);
        expect(list.map(item => item.renderMode)).toEqual(["html", "markdown"]);
        expect(list[0].model).toBe("未知模型");
        expect(normalizeSummary(null)).toBeNull();
    });

    test("merge dedupes identical records", () => {
        const a = normalizeSummaryList([{ summary: "x", timestamp: "2026-01-01T00:00:00Z", model: "m" }]);
        const b = normalizeSummaryList([{ summary: "x", timestamp: "2026-01-01T00:00:00Z", model: "m" }, { summary: "y", timestamp: "2026-03-01T00:00:00Z", model: "m" }]);
        expect(mergeSummaries(a, b).map(item => item.summary)).toEqual(["y", "x"]);
    });

    test("qa merge keys by id", () => {
        const one = { id: "1", question: "q", answer: "a", presetId: "", presetName: "", timestamp: "2026-01-01T00:00:00.000Z", model: "m" };
        expect(mergeQA([one], [{ ...one, answer: "b" }])).toHaveLength(1);
    });
});

describe("dearrow state merge", () => {
    const base = { originalTitle: "震惊！", updatedAt: "" };

    test("same title keeps the newest bundle of each kind", () => {
        const left = normalizeDeArrow({ ...base, verdict: true, verdictReason: "旧", verdictUpdatedAt: "2026-01-01T00:00:00Z", rewrittenTitle: "新标题 A", rewrittenAt: "2026-03-01T00:00:00Z" })!;
        const right = normalizeDeArrow({ ...base, verdict: false, verdictReason: "新", verdictUpdatedAt: "2026-02-01T00:00:00Z", rewrittenTitle: "新标题 B", rewrittenAt: "2026-01-15T00:00:00Z" })!;
        const merged = mergeDeArrowState(left, right)!;
        expect(merged.verdict).toBe(false);
        expect(merged.verdictReason).toBe("新");
        expect(merged.rewrittenTitle).toBe("新标题 A");
        expect(merged.updatedAt).toBe("2026-03-01T00:00:00.000Z");
    });

    test("different original titles keep the most recently updated state", () => {
        const old = normalizeDeArrow({ originalTitle: "旧标题", verdict: true, verdictUpdatedAt: "2026-01-01T00:00:00Z" })!;
        const fresh = normalizeDeArrow({ originalTitle: "新标题", updatedAt: "2026-02-01T00:00:00Z" })!;
        expect(mergeDeArrowState(old, fresh)?.originalTitle).toBe("新标题");
        expect(mergeDeArrowMaps({ 1: old }, { 1: fresh, 2: old })).toEqual({ 1: fresh, 2: old });
    });
});

describe("dearrow scope", () => {
    test("validates lines and reports errors", () => {
        expect(checkScope("https://linux.do/latest\nhttp://linux.do/x\nnot a url").errors).toHaveLength(2);
        expect(checkScope("").errors).toEqual(["至少需要一条作用范围 URL"]);
        expect(checkScope(["https://linux.do/latest#a", "https://linux.do/latest"]).rules).toEqual(["https://linux.do/latest"]);
    });

    test("exact by default, * wildcard, hash ignored", () => {
        const compiled = compileScope(checkScope("https://linux.do/latest?order=created\nhttps://linux.do/c/*").rules);
        expect(scopeMatches(compiled, "https://linux.do/latest?order=created#x")).toBe(true);
        expect(scopeMatches(compiled, "https://linux.do/latest")).toBe(false);
        expect(scopeMatches(compiled, "https://linux.do/c/develop/4")).toBe(true);
    });
});

describe("dearrow protocol", () => {
    test("judge request carries at most 20 topics", () => {
        const topics = Array.from({ length: 25 }, (_, i) => ({ topicId: String(i), title: `t${i}` }));
        expect(JSON.parse(buildJudgeMessages("", topics)[1].content as string)).toHaveLength(20);
    });

    test("judge parsing tolerates fences, aliases and duplicates", () => {
        const text = "```json\n{\"topics\":[{\"topic_id\":1,\"isClickbait\":\"true\",\"reason\":\"夸张\"},{\"id\":\"1\",\"verdict\":false},{\"topicId\":\"2\",\"verdict\":false}]}\n```";
        expect(parseJudge(text)).toEqual([{ topicId: "1", verdict: true, reason: "夸张" }, { topicId: "2", verdict: false, reason: "" }]);
        expect(() => parseJudge("nope")).toThrow();
    });

    test("rewrite parsing accepts json or plain text and rejects html", () => {
        expect(parseRewrite("{\"title\":\" Docker 部署 GPU 报错求助 \"}")).toBe("Docker 部署 GPU 报错求助");
        expect(parseRewrite("纯文本标题")).toBe("纯文本标题");
        expect(() => parseRewrite("{\"title\":\"<b>x</b>\"}")).toThrow();
        expect(() => parseRewrite("{\"title\":\"\"}")).toThrow();
    });
});
