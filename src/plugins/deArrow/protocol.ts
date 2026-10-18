/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ChatMessage } from "@api/AI";
import { asString, isObject } from "@utils/guards";
import { normalizeText } from "@utils/text";

export const JUDGE_BATCH = 20;
export const MAX_TITLE_LENGTH = 120;

export const DEFAULT_JUDGE_PROMPT = [
    "你是论坛标题质量评审，只能依据标题本身判断，不要猜测正文。",
    "如果标题夸大其词、制造恐慌或紧迫感、故意隐去关键信息吊胃口（如「震惊」「万万没想到」「这件事」「速看」），判为标题党。",
    "普通的提问、求助、吐槽、幽默或简短标题本身不算标题党。",
    "只返回严格 JSON，不要任何解释：{\"results\":[{\"topicId\":\"…\",\"verdict\":true,\"reason\":\"不超过 20 字的原因\"}]}。",
    "输入里的每个 topicId 必须且只能出现一次。",
].join("\n");

export const DEFAULT_REWRITE_PROMPT = [
    "你负责根据论坛话题的首帖内容重写标题。",
    "新标题要具体、中立、不夸张，让读者一眼看出首帖实际在说什么；保留重要的技术名词、产品名、版本号和数字。",
    "不得加入首帖中没有的事实，长度尽量不超过 40 个字。",
    "只返回严格 JSON：{\"title\":\"新标题\"}，不要 Markdown、HTML 或解释。",
].join("\n");

export interface JudgeInput {
    topicId: string;
    title: string;
}

export interface JudgeResult {
    topicId: string;
    verdict: boolean;
    reason: string;
}

export function unfence(text: string): string {
    const trimmed = text.trim();
    const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) return fenced[1].trim();
    const start = trimmed.search(/[[{]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    return start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

function asBool(value: unknown): boolean | null {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "是") return true;
    if (value === "false" || value === "否") return false;
    return null;
}

export function buildJudgeMessages(prompt: string, topics: JudgeInput[]): ChatMessage[] {
    return [
        { role: "system", content: prompt.trim() || DEFAULT_JUDGE_PROMPT },
        { role: "user", content: JSON.stringify(topics.slice(0, JUDGE_BATCH).map(topic => ({ topicId: topic.topicId, title: topic.title }))) },
    ];
}

export function parseJudge(text: string): JudgeResult[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(unfence(text));
    } catch (error) {
        throw new Error(`判断结果不是有效 JSON：${(error as Error).message}`, { cause: error });
    }
    const list = Array.isArray(parsed) ? parsed : isObject(parsed) ? parsed.results ?? parsed.topics : null;
    if (!Array.isArray(list)) throw new Error("判断结果缺少 results 数组");
    const seen = new Set<string>();
    const out: JudgeResult[] = [];
    for (const item of list) {
        if (!isObject(item)) continue;
        const topicId = asString(item.topicId ?? item.topic_id ?? item.id);
        const verdict = asBool(item.verdict ?? item.isClickbait ?? item.clickbait);
        if (!topicId || verdict === null || seen.has(topicId)) continue;
        seen.add(topicId);
        out.push({ topicId, verdict, reason: asString(item.reason) });
    }
    return out;
}

export function buildRewriteMessages(prompt: string, originalTitle: string, firstPost: string, imageCount: number): ChatMessage[] {
    const system = [prompt.trim() || DEFAULT_REWRITE_PROMPT, imageCount ? "用户消息附带了首帖中的图片，请结合图片内容与正文里的 [图片#N] 标记理解首帖。" : ""].filter(Boolean).join("\n");
    return [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify({ originalTitle, firstPost, ...(imageCount ? { attachedImageCount: imageCount } : {}) }) },
    ];
}

export function parseRewrite(text: string): string {
    const raw = text.trim();
    let title = raw;
    if (/^(```|\{|")/.test(raw)) {
        try {
            const parsed = JSON.parse(unfence(raw)) as unknown;
            title = typeof parsed === "string" ? parsed : isObject(parsed) ? asString(parsed.title) : "";
        } catch (error) {
            throw new Error(`改写结果不是有效 JSON：${(error as Error).message}`, { cause: error });
        }
    }
    title = normalizeText(title);
    if (!title) throw new Error("改写结果为空");
    if (/<\/?[a-z][^>]*>/i.test(title)) throw new Error("改写结果包含 HTML");
    if (title.length > MAX_TITLE_LENGTH) throw new Error(`改写结果过长（${title.length} 字）`);
    return title;
}
