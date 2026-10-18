/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { asString, isObject } from "@utils/guards";
import { inferRenderMode, type RenderMode } from "@utils/markdown";
import { escapeRegExp } from "@utils/text";

export interface PromptConfig {
    id: string;
    name: string;
    system: string;
    format: string;
}

const METHOD = [
    "你是严谨的中文技术社区内容分析师。下面是 LINUX DO 论坛的一个话题：#1 为发帖人，其余为回复，格式为「#楼层 用户名[ 回复 用户名]：内容」。",
    "请输出结构化总结，包含三部分：",
    "1. 内容概述：两三句话说明话题在讨论什么、发帖人的诉求或观点。",
    "2. 关键要点：按重要性列出讨论中的核心观点、方案、数据、链接与结论，注明提出者的用户名。",
    "3. 结论与共识：一句话概括当前结论；如有分歧或悬而未决的问题，单独指出。",
    "要求：客观中立；忽略与主题无关的闲聊；不得编造原文没有的信息；篇幅随讨论复杂度调整；正文中的 [图片#N] 对应随消息附带的图片。",
].join("\n");

const MARKDOWN_FORMAT = [
    "输出格式：Markdown。",
    "三部分分别使用「### 内容概述」「### 关键要点」「### 结论与共识」作为标题；关键要点用有序列表；用户名使用 **粗体**，发帖人用户名额外加「（楼主）」。",
    "不要用代码块包裹整个回答，不要输出与总结无关的说明。",
].join("\n");

const HTML_FORMAT = [
    "输出格式：HTML 片段（不要使用 ``` 包裹，不要输出 <html>/<body>）。",
    "三部分分别使用 <h3>内容概述</h3>、<h3>关键要点</h3>、<h3>结论与共识</h3>，部分之间用 <hr> 分隔；关键要点使用 <ol><li>；用户名使用 <b>，发帖人用户名可用 color 样式突出（不要用红色）。",
    "不要输出与总结无关的说明。",
].join("\n");

export const DEFAULT_PROMPTS: PromptConfig[] = [
    { id: "markdown", name: "结构化总结（Markdown）", system: METHOD, format: MARKDOWN_FORMAT },
    { id: "html", name: "结构化总结（HTML 彩色）", system: METHOD, format: HTML_FORMAT },
];

export function normalizePrompts(raw: unknown): PromptConfig[] {
    const list = Array.isArray(raw) ? raw : [];
    const out: PromptConfig[] = [];
    const seen = new Set<string>();
    list.forEach((item, index) => {
        if (!isObject(item)) return;
        const system = asString(item.system ?? item.summaryMethod);
        const format = asString(item.format ?? item.outputFormat);
        if (!system && !format) return;
        let id = asString(item.id) || `prompt-${index + 1}`;
        while (seen.has(id)) id = `${id}-${index + 1}`;
        seen.add(id);
        out.push({ id, name: asString(item.name) || `提示词 ${index + 1}`, system, format });
    });
    return out.length ? out : structuredClone(DEFAULT_PROMPTS);
}

export function renderModeOf(prompt: PromptConfig, output: string): RenderMode {
    const format = prompt.format.toLowerCase();
    if (format.includes("markdown")) return "markdown";
    if (format.includes("html")) return "html";
    return inferRenderMode(output, "markdown");
}

export function stripFences(text: string, prefixes: string[], suffixes: string[]): string {
    let out = text.trim();
    for (const token of prefixes) {
        if (token) out = out.replace(new RegExp(`^\\s*${escapeRegExp(token)}\\s*`, "i"), "");
    }
    for (const token of suffixes) {
        if (token) out = out.replace(new RegExp(`\\s*${escapeRegExp(token)}\\s*$`, "i"), "");
    }
    return out.trim();
}
