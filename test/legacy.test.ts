/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { beforeAll, describe, expect, test } from "bun:test";

import { registerPlugin } from "../src/api/PluginManager";
import AI from "../src/plugins/_core/ai";
import { convertLegacy, describeLegacy } from "../src/plugins/_core/settings/legacy";
import SearchFilter from "../src/plugins/searchFilter";
import TopicBlocker from "../src/plugins/topicBlocker";

beforeAll(() => {
    for (const plugin of [AI, TopicBlocker, SearchFilter]) registerPlugin(plugin);
});

describe("legacy import", () => {
    test("blocker export maps rules and per-term search filters", () => {
        const raw = {
            schemaVersion: 1,
            blockedTitles: ["抽奖"],
            blockedCategories: ["搞七捻三"],
            blockedTtags: ["纯水"],
            titleRegexList: [{ pattern: "^\\[求助\\]", note: "求助帖" }],
            categoryRegexList: [],
            tagRegexList: ["^ai$"],
            searchFilterMap: { docker: { blacklist: "广告, 水", whitelist: "", regex: "^\\[" } },
            summaryScriptEnabled: true,
        };
        expect(describeLegacy(raw)).toBe("旧版屏蔽脚本配置");
        const backup = convertLegacy(raw)!;
        const rules = backup.settingsPatch?.TopicBlocker?.rules as { titleKeywords: string[]; tags: string[]; titleRegex: unknown[]; tagRegex: unknown[] };
        expect(rules.titleKeywords).toEqual(["抽奖"]);
        expect(rules.tags).toEqual(["纯水"]);
        expect(rules.titleRegex).toEqual([{ pattern: "^\\[求助\\]", note: "求助帖" }]);
        expect(rules.tagRegex).toEqual([{ pattern: "^ai$", note: "" }]);
        expect(backup.settingsPatch?.SearchFilter?.rules).toEqual({ docker: { blacklist: ["广告", "水"], whitelist: [], regex: ["^\\["] } });
    });

    test("summary all-data export maps settings and data", () => {
        const raw = {
            settings: {
                promptConfigurations: [{ name: "旧 HTML", summaryMethod: "总结方法", outputFormat: "HTML 格式" }],
                currentPromptIndex: 0,
                apiConfigurations: [{ name: "主力", url: "https://api.example.com/v1/chat/completions", key: "sk-1", model: "m1", imageInputEnabled: true, maxImageBytes: 2 * 1024 * 1024 }, { name: "便宜", url: "https://api.example.com/v1/chat/completions", key: "sk-2", model: "m2" }],
                currentApiIndex: 0,
                dearrowEnabled: true,
                dearrowJudgmentApiIndex: 1,
                dearrowRewriteApiIndex: 0,
                dearrowScopeRules: ["https://linux.do/latest"],
                listPageSummaryEnabled: false,
                autoShowSummaryInList: true,
                toastSettings: { info: { autoClose: true, duration: 2 }, error: { autoClose: false, duration: 0 } },
                driveSummarySettings: { enabled: true, clientId: "cid", clientSecret: "sec", refreshToken: "rt" },
                summaryTopicIds: ["9", "10"],
            },
            summaryHistory: { 10: [{ summary: "<p>x</p>", timestamp: "2026-01-01T00:00:00Z", model: "m1" }] },
            topicQuestionHistory: { 10: [{ id: "q1", question: "?", answer: "!", timestamp: "2026-01-02T00:00:00Z" }] },
            dearrowTopicStates: { 10: { originalTitle: "震惊", verdict: true, verdictUpdatedAt: "2026-01-03T00:00:00Z" } },
        };
        expect(describeLegacy(raw)).toBe("旧版总结脚本「全部数据」");
        const backup = convertLegacy(raw)!;
        const patch = backup.settingsPatch!;
        const profiles = patch.AI.profiles as Array<{ id: string; imageInput: boolean; maxImageMB: number; model: string }>;
        expect(profiles.map(profile => profile.model)).toEqual(["m1", "m2"]);
        expect(profiles[0].imageInput).toBe(true);
        expect(profiles[0].maxImageMB).toBe(2);
        expect(patch.AI.activeProfile).toBe(profiles[0].id);
        expect(patch.DeArrow).toMatchObject({ enabled: true, judgeProfile: profiles[1].id, rewriteProfile: profiles[0].id, scope: "https://linux.do/latest" });
        expect(patch.ListSummary).toMatchObject({ enabled: false, singleExpand: true });
        expect(patch.Notifications).toMatchObject({ infoSeconds: 2, errorSeconds: 0 });
        expect(patch.DriveSync).toEqual({ enabled: true, clientId: "cid", clientSecret: "sec", refreshToken: "rt" });
        expect(backup.data.summaries?.["10"]).toHaveLength(1);
        expect(backup.data.questions?.["10"]?.[0].id).toBe("q1");
        expect(backup.data.dearrow?.["10"]?.verdict).toBe(true);
        expect(backup.data.summarized).toEqual(["9", "10"]);
    });

    test("summary content export is detected", () => {
        const raw = { 123: [{ summary: "## a", timestamp: "2026-01-01T00:00:00Z" }] };
        expect(describeLegacy(raw)).toBe("旧版总结脚本「总结内容」");
        expect(convertLegacy(raw)?.data.summaries?.["123"]?.[0].renderMode).toBe("markdown");
        expect(convertLegacy({ foo: 1 })).toBeNull();
    });

    test("summary settings map the list panel width, and pixel widths are left alone", () => {
        const percent = convertLegacy({ apiConfigurations: [], promptConfigurations: [], summaryWidthType: "percent", summaryWidthValue: 80, listPageSummaryMaxLines: 20, autoShowSummaryInList: true })!;
        expect(percent.settingsPatch?.ListSummary).toMatchObject({ widthPercent: 80, maxLines: 20, singleExpand: true });
        const pixels = convertLegacy({ apiConfigurations: [], promptConfigurations: [], summaryWidthType: "px", summaryWidthValue: 900 })!;
        expect(pixels.settingsPatch?.ListSummary?.widthPercent).toBeUndefined();
    });

    test("data-only export does not report empty settings modules", () => {
        const backup = convertLegacy({ settings: { summaryTopicIds: ["7"] }, summaryHistory: { 7: [{ summary: "x", timestamp: "2026-01-01T00:00:00Z" }] } })!;
        expect(backup.settingsPatch).toBeUndefined();
        expect(backup.data.summarized).toEqual(["7"]);
    });
});
