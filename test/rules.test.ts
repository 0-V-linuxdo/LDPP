/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { evaluateSearch, normalizeSearchRule, normalizeSearchRules, primaryTerm } from "../src/plugins/searchFilter/query";
import { compileRules, countRules, EMPTY_RULES, evaluate, normalizeRules, parseRegex, regexError, withAdditions, withoutReasons } from "../src/plugins/topicBlocker/rules";

const facts = { title: "Docker 部署 Ollama 遇到 GPU 问题", category: "开发调优", tags: ["AI", "纯水"] };

describe("topic blocker rules", () => {
    test("title keywords match case-insensitively as substrings", () => {
        const reasons = evaluate(compileRules({ ...EMPTY_RULES, titleKeywords: ["docker"] }), facts);
        expect(reasons).toEqual([{ kind: "titleKeyword", rule: "docker", matched: facts.title }]);
    });

    test("categories and tags match whole values ignoring case", () => {
        const rules = { ...EMPTY_RULES, categories: ["开发调优"], tags: ["ai", "AI2"] };
        const kinds = evaluate(compileRules(rules), facts).map(reason => `${reason.kind}:${reason.rule}`);
        expect(kinds).toEqual(["category:开发调优", "tag:ai"]);
        expect(evaluate(compileRules({ ...EMPTY_RULES, categories: ["开发"] }), facts)).toEqual([]);
    });

    test("regex rules support plain and /pattern/flags forms", () => {
        expect(parseRegex("/ollama/i").test("OLLAMA")).toBe(true);
        expect(parseRegex("Ollama").test("ollama")).toBe(false);
        expect(parseRegex("/x/g").flags).toBe("");
        const rules = { ...EMPTY_RULES, titleRegex: [{ pattern: "/gpu/i", note: "显卡" }], tagRegex: [{ pattern: "^纯", note: "" }] };
        const reasons = evaluate(compileRules(rules), facts);
        expect(reasons.map(reason => reason.kind)).toEqual(["titleRegex", "tagRegex"]);
        expect(reasons[0].note).toBe("显卡");
    });

    test("invalid regex is reported and skipped", () => {
        expect(regexError("(")).not.toBeNull();
        const compiled = compileRules({ ...EMPTY_RULES, titleRegex: [{ pattern: "(", note: "" }] });
        expect(compiled.invalid).toEqual(["("]);
        expect(evaluate(compiled, facts)).toEqual([]);
    });

    test("additions dedupe and removals drop exactly the matched rule", () => {
        const added = withAdditions(EMPTY_RULES, { titleKeywords: ["Docker", "docker", "GPU"], tags: ["AI"] });
        expect(added.titleKeywords).toEqual(["Docker", "GPU"]);
        const reasons = evaluate(compileRules(added), facts);
        const removed = withoutReasons(added, reasons.filter(reason => reason.rule === "GPU"));
        expect(removed.titleKeywords).toEqual(["Docker"]);
        expect(removed.tags).toEqual(["AI"]);
        expect(countRules(removed)).toBe(2);
    });

    test("normalizeRules accepts legacy-shaped regex entries", () => {
        const rules = normalizeRules({ titleKeywords: [" a ", "", "A"], titleRegex: ["^x", { value: "y", note: " n " }, { pattern: "" }] });
        expect(rules.titleKeywords).toEqual(["a"]);
        expect(rules.titleRegex).toEqual([{ pattern: "^x", note: "" }, { pattern: "y", note: "n" }]);
    });
});

describe("search filter", () => {
    test("primary term drops directives but keeps quoted phrases and urls", () => {
        expect(primaryTerm("docker in:title order:latest")).toBe("docker");
        expect(primaryTerm("\"hello world\" status:open")).toBe("hello world");
        expect(primaryTerm("https://linux.do/t/1 in:first")).toBe("https://linux.do/t/1");
        expect(primaryTerm("in:title")).toBe("in:title");
    });

    test("blacklist, whitelist and regex verdicts", () => {
        const rule = normalizeSearchRule({ blacklist: "广告, 抽奖", whitelist: "docker\nk8s", regex: "^\\[求助\\]\n/GPU/" });
        expect(evaluateSearch(rule, "Docker 抽奖活动").map(v => v.kind)).toEqual(["blacklist"]);
        expect(evaluateSearch(rule, "无关标题").map(v => v.kind)).toEqual(["whitelist"]);
        expect(evaluateSearch(rule, "[求助] docker").map(v => v.kind)).toEqual(["regex"]);
        expect(evaluateSearch(rule, "docker GPU").map(v => v.kind)).toEqual(["regex"]);
        expect(evaluateSearch(rule, "Docker 部署")).toEqual([]);
    });

    test("multi-word keywords tolerate extra whitespace", () => {
        const rule = normalizeSearchRule({ blacklist: ["open ai"] });
        expect(evaluateSearch(rule, "OPEN   AI 新模型").length).toBe(1);
    });

    test("legacy string rules become blacklists and empty rules are dropped", () => {
        expect(normalizeSearchRules({ docker: "广告,水", empty: { blacklist: "" } })).toEqual({ docker: { blacklist: ["广告", "水"], whitelist: [], regex: [] } });
    });
});
