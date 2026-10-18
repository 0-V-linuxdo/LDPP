/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { normalizeProfile } from "@api/AI";
import { normalizeDeArrowMap, normalizeQAList, normalizeSummaryList } from "@api/records";
import { asString, asStringArray, isObject } from "@utils/guards";

import { normalizeKeywords, normalizeLinks, parseKeywordExport, settings as keywordSettings } from "../../keywordSearch";
import { normalizeSearchRules, type SearchRule } from "../../searchFilter/query";
import { settings as searchSettings } from "../../searchFilter";
import { rulesAccess } from "../../topicBlocker";
import { type BlockRules, dedupe, normalizeRegexRules, normalizeRules } from "../../topicBlocker/rules";
import { normalizePrompts } from "../../topicSummary/prompts";
import { listProfiles } from "../ai";
import type { Backup, BackupData } from "./data";

type Patch = Record<string, Record<string, unknown>>;

const MB = 1024 * 1024;
const BLOCKER_KEYS = ["blockedTitles", "blockedCategories", "blockedTags", "blockedTtags", "titleRegexList", "categoryRegexList", "tagRegexList", "searchFilterMap"];

const isBlockerExport = (raw: Record<string, unknown>) => BLOCKER_KEYS.some(key => key in raw);
const isSummarySettings = (raw: Record<string, unknown>) => Array.isArray(raw.promptConfigurations) || Array.isArray(raw.apiConfigurations);
const isSummaryContent = (raw: Record<string, unknown>) => {
    const values = Object.values(raw);
    return values.length > 0 && values.every(value => Array.isArray(value) && value.every(item => isObject(item) && "summary" in item));
};
const isAllData = (raw: Record<string, unknown>) => "summaryHistory" in raw || "topicQuestionHistory" in raw || "dearrowTopicStates" in raw;

export function describeLegacy(raw: unknown): string {
    if (!isObject(raw)) return "未知";
    if (isAllData(raw)) return "旧版总结脚本「全部数据」";
    if (isSummarySettings(raw)) return "旧版总结脚本「脚本配置」";
    if (isBlockerExport(raw)) return "旧版屏蔽脚本配置";
    if (isSummaryContent(raw)) return "旧版总结脚本「总结内容」";
    if (parseKeywordExport(raw)) return "「Keywords Search Enhanced」导出文件";
    return "未知";
}

const regex = (a: BlockRules["titleRegex"], b: BlockRules["titleRegex"]) => [...a, ...b.filter(rule => !a.some(existing => existing.pattern === rule.pattern))];

function mergeBlockRules(incoming: BlockRules): BlockRules {
    const current = rulesAccess.get();
    return {
        titleKeywords: dedupe([...current.titleKeywords, ...incoming.titleKeywords]),
        categories: dedupe([...current.categories, ...incoming.categories]),
        tags: dedupe([...current.tags, ...incoming.tags]),
        titleRegex: regex(current.titleRegex, incoming.titleRegex),
        categoryRegex: regex(current.categoryRegex, incoming.categoryRegex),
        tagRegex: regex(current.tagRegex, incoming.tagRegex),
    };
}

function mergeSearchRules(incoming: Record<string, SearchRule>): Record<string, SearchRule> {
    const current = normalizeSearchRules(searchSettings.store.rules);
    for (const [term, rule] of Object.entries(incoming)) {
        const existing = current[term];
        current[term] = existing ? {
            blacklist: dedupe([...existing.blacklist, ...rule.blacklist]),
            whitelist: dedupe([...existing.whitelist, ...rule.whitelist]),
            regex: Array.from(new Set([...existing.regex, ...rule.regex])),
        } : rule;
    }
    return current;
}

function blockerPatch(raw: Record<string, unknown>): Patch {
    const patch: Patch = {};
    const rules = normalizeRules({
        titleKeywords: raw.blockedTitles,
        categories: raw.blockedCategories,
        tags: raw.blockedTags ?? raw.blockedTtags,
        titleRegex: normalizeRegexRules(raw.titleRegexList),
        categoryRegex: normalizeRegexRules(raw.categoryRegexList),
        tagRegex: normalizeRegexRules(raw.tagRegexList),
    });
    patch.TopicBlocker = { rules: mergeBlockRules(rules) };
    const search = normalizeSearchRules(raw.searchFilterMap);
    if (Object.keys(search).length) patch.SearchFilter = { rules: mergeSearchRules(search) };
    return patch;
}

function toastSeconds(raw: unknown, fallback: number): number {
    if (!isObject(raw)) return fallback;
    if (raw.autoClose === false) return 0;
    const value = Number(raw.duration);
    return Number.isFinite(value) ? Math.max(0, Math.min(60, value)) : fallback;
}

function summarySettingsPatch(raw: Record<string, unknown>): { patch: Patch; summarized: string[] } {
    const patch: Patch = {};
    const apis = Array.isArray(raw.apiConfigurations) ? raw.apiConfigurations : [];
    const imported = apis.filter(isObject).map((api, index) => normalizeProfile({
        id: `legacy-${index + 1}`,
        name: api.name,
        url: api.url,
        key: api.key,
        model: api.model,
        retryCount: api.retryCount ?? raw.autoRetryCount,
        retryInterval: api.retryInterval ?? raw.autoRetryInterval,
        imageInput: api.imageInputEnabled === true,
        imageDetail: api.imageDetail,
        maxImages: api.maxImagesPerRequest,
        maxImageMB: Number(api.maxImageBytes) / MB || undefined,
        maxTotalImageMB: Number(api.maxTotalImageBytes) / MB || undefined,
    }));
    const idAt = (index: unknown) => imported[Number.parseInt(String(index ?? 0), 10)]?.id ?? imported[0]?.id ?? "";
    if (imported.length) {
        const existing = listProfiles().filter(profile => profile.key && !imported.some(item => item.url === profile.url && item.model === profile.model && item.key === profile.key));
        patch.AI = { profiles: [...imported, ...existing], activeProfile: idAt(raw.currentApiIndex) };
    }
    if (Array.isArray(raw.promptConfigurations)) {
        const prompts = normalizePrompts(raw.promptConfigurations).map((prompt, index) => ({ ...prompt, id: `legacy-prompt-${index + 1}` }));
        const index = Number.parseInt(String(raw.currentPromptIndex ?? 0), 10);
        patch.TopicSummary = { prompts, activePrompt: prompts[index]?.id ?? prompts[0]?.id };
    }
    const summary: Record<string, unknown> = patch.TopicSummary ?? {};
    if ("newTopicAutoSummarize" in raw) summary.autoSummarize = raw.newTopicAutoSummarize === true;
    if ("defaultOpenSidebar" in raw) summary.autoOpen = raw.defaultOpenSidebar === true;
    if (raw.sidebarPosition === "left" || raw.sidebarPosition === "right") summary.sidebarPosition = raw.sidebarPosition;
    if (isObject(raw.summaryOutputFilters)) {
        summary.stripFences = raw.summaryOutputFilters.enabled !== false;
        summary.fencePrefixes = asStringArray(raw.summaryOutputFilters.leadingTokens).join("\n");
        summary.fenceSuffixes = asStringArray(raw.summaryOutputFilters.trailingTokens).join("\n");
    }
    if (Object.keys(summary).length) patch.TopicSummary = summary;
    const list: Record<string, unknown> = {};
    if ("listPageSummaryEnabled" in raw) list.enabled = raw.listPageSummaryEnabled !== false;
    if ("autoShowSummaryInList" in raw) list.singleExpand = raw.autoShowSummaryInList !== false;
    if ("listPageSummaryMaxLines" in raw) list.maxLines = Math.min(40, Math.max(4, Number(raw.listPageSummaryMaxLines) || 14));
    if (raw.summaryWidthType === "percent" && Number.isFinite(Number(raw.summaryWidthValue))) list.widthPercent = Math.min(100, Math.max(40, Math.round(Number(raw.summaryWidthValue))));
    if (Object.keys(list).length) patch.ListSummary = list;
    if (Array.isArray(raw.customQuestionPresets)) {
        patch.TopicQA = { presets: raw.customQuestionPresets.filter(isObject).map((preset, index) => ({ id: asString(preset.id) || `legacy-preset-${index + 1}`, name: asString(preset.name), prompt: asString(preset.prompt) })).filter(preset => preset.prompt) };
    }
    const dearrow: Record<string, unknown> = {};
    if ("dearrowEnabled" in raw) dearrow.enabled = raw.dearrowEnabled === true;
    if ("dearrowAutoRewrite" in raw) dearrow.autoRewrite = raw.dearrowAutoRewrite === true;
    if (asString(raw.dearrowJudgmentPrompt)) dearrow.judgePrompt = asString(raw.dearrowJudgmentPrompt);
    if (asString(raw.dearrowRewritePrompt)) dearrow.rewritePrompt = asString(raw.dearrowRewritePrompt);
    if (imported.length) {
        dearrow.judgeProfile = idAt(raw.dearrowJudgmentApiIndex ?? raw.dearrowApiIndex);
        dearrow.rewriteProfile = idAt(raw.dearrowRewriteApiIndex ?? raw.dearrowApiIndex);
    }
    const scope = asStringArray(raw.dearrowScopeRules);
    if (scope.length) dearrow.scope = scope.join("\n");
    if (Object.keys(dearrow).length) patch.DeArrow = dearrow;
    const toast: Record<string, unknown> = {};
    if ("toastEnabled" in raw) toast.enabled = raw.toastEnabled !== false;
    if (isObject(raw.toastSettings)) {
        toast.infoSeconds = toastSeconds(raw.toastSettings.info, 3);
        toast.successSeconds = toastSeconds(raw.toastSettings.success, 0);
        toast.warningSeconds = toastSeconds(raw.toastSettings.warning, 6);
        toast.errorSeconds = toastSeconds(raw.toastSettings.error, 0);
    }
    if ("toastAutoExpand" in raw) toast.clickExpands = raw.toastAutoExpand !== false;
    if ("toastClickAutoOpenSidebar" in raw) toast.clickOpensSidebar = raw.toastClickAutoOpenSidebar !== false;
    if (Object.keys(toast).length) patch.Notifications = toast;
    if (isObject(raw.driveSummarySettings)) {
        const drive = raw.driveSummarySettings;
        patch.DriveSync = { enabled: drive.enabled === true, clientId: asString(drive.clientId), clientSecret: asString(drive.clientSecret), refreshToken: asString(drive.refreshToken) };
    }
    return { patch, summarized: asStringArray(raw.summaryTopicIds) };
}

function listMap<T>(raw: unknown, normalize: (value: unknown) => T[]): Record<string, T[]> {
    const out: Record<string, T[]> = {};
    if (!isObject(raw)) return out;
    for (const [id, value] of Object.entries(raw)) {
        const items = normalize(value);
        if (items.length) out[id] = items;
    }
    return out;
}

function backup(patch: Patch, data: BackupData): Backup {
    return { format: "ldpp-backup", version: 1, exportedAt: new Date().toISOString(), settingsPatch: Object.keys(patch).length ? patch : undefined, data };
}

export function convertLegacy(raw: unknown): Backup | null {
    if (!isObject(raw)) return null;
    if (isAllData(raw)) {
        const fromSettings = isObject(raw.settings) ? summarySettingsPatch(raw.settings) : { patch: {}, summarized: [] };
        return backup(fromSettings.patch, {
            summaries: listMap(raw.summaryHistory, normalizeSummaryList),
            questions: listMap(raw.topicQuestionHistory, normalizeQAList),
            summarized: fromSettings.summarized,
            dearrow: normalizeDeArrowMap(raw.dearrowTopicStates),
        });
    }
    if (isSummarySettings(raw)) {
        const { patch, summarized } = summarySettingsPatch(raw);
        return backup(patch, { summarized });
    }
    if (isBlockerExport(raw)) return backup(blockerPatch(raw), {});
    if (isSummaryContent(raw)) return backup({}, { summaries: listMap(raw, normalizeSummaryList) });
    const saved = parseKeywordExport(raw);
    if (saved) {
        // Merged into the lists already here (duplicates dropped), as the plugin's own import does.
        const patch: Record<string, unknown> = {};
        if (saved.keywords) patch.keywords = normalizeKeywords([...normalizeKeywords(keywordSettings.store.keywords), ...saved.keywords]);
        if (saved.links) patch.links = normalizeLinks([...normalizeLinks(keywordSettings.store.links), ...saved.links]);
        return backup({ KeywordSearch: patch }, {});
    }
    return null;
}
