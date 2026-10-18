/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { hasSummary } from "@api/DataStore";
import { currentRoute } from "@api/Navigation";
import { definePluginSettings } from "@api/Settings";
import { SparkIcon } from "@components/icons";
import definePlugin, { OptionType } from "@utils/types";

import { configureEngine, summarizeTopic } from "./engine";
import { renderPromptEditor } from "./promptEditor";
import { DEFAULT_PROMPTS, normalizePrompts, type PromptConfig } from "./prompts";
import { setSidebarOpen, sidebarTopic, syncSidebar, toggleSidebar, unmountSidebar } from "./sidebar";

export const settings = definePluginSettings({
    prompts: {
        type: OptionType.CUSTOM,
        default: DEFAULT_PROMPTS as PromptConfig[],
    },
    activePrompt: {
        type: OptionType.CUSTOM,
        default: DEFAULT_PROMPTS[0].id,
    },
    promptEditor: {
        type: OptionType.COMPONENT,
        description: "提示词",
        render: (): HTMLElement => renderPromptEditor({
            list: () => normalizePrompts(settings.store.prompts),
            save: next => { settings.store.prompts = next; },
            activeId: () => settings.store.activePrompt,
            setActive: id => { settings.store.activePrompt = id; },
        }),
    },
    autoSummarize: {
        type: OptionType.BOOLEAN,
        description: "打开没有总结的话题时自动生成总结（离开话题会自动取消）。",
        default: false,
    },
    maxPosts: {
        type: OptionType.NUMBER,
        description: "每次最多读取的楼层数（0 表示不限制）。超长话题建议设上限以控制费用。",
        min: 0,
        max: 10000,
        default: 1000,
    },
    stripFences: {
        type: OptionType.BOOLEAN,
        description: "去掉 AI 回答首尾多余的代码块标记（如 ```html）。",
        default: true,
    },
    fencePrefixes: {
        type: OptionType.STRING,
        description: "需要去掉的开头标记（每行一个）",
        group: "代码块标记",
        tab: "开头",
        multiline: true,
        default: "```html\n```markdown\n```md\n```",
    },
    fenceSuffixes: {
        type: OptionType.STRING,
        description: "需要去掉的结尾标记（每行一个）",
        group: "代码块标记",
        tab: "结尾",
        multiline: true,
        default: "```",
    },
    sidebarPosition: {
        type: OptionType.SELECT,
        description: "侧栏位置",
        options: [
            { label: "右侧", value: "right", default: true },
            { label: "左侧", value: "left" },
        ],
    },
    autoOpen: {
        type: OptionType.BOOLEAN,
        description: "进入话题页时自动展开侧栏。",
        default: false,
    },
    hotkey: {
        type: OptionType.BOOLEAN,
        description: "使用 Alt + S 展开 / 收起侧栏。",
        default: true,
    },
});

const lines = (value: string) => value.split("\n").map(line => line.trim()).filter(Boolean);

function activePrompt(): PromptConfig {
    const prompts = normalizePrompts(settings.store.prompts);
    return prompts.find(prompt => prompt.id === settings.store.activePrompt) ?? prompts[0];
}

function sidebarOptions() {
    return {
        position: settings.store.sidebarPosition === "left" ? "left" as const : "right" as const,
        autoOpen: settings.store.autoOpen,
    };
}

let startupTimer: ReturnType<typeof setTimeout> | undefined;

function maybeAutoSummarize() {
    const { kind, topicId } = currentRoute();
    if (kind !== "topic" || !topicId || !settings.store.autoSummarize || hasSummary(topicId)) return;
    void summarizeTopic(topicId, { mode: "auto" });
}

function onKeydown(event: KeyboardEvent) {
    if (!settings.store.hotkey || !event.altKey || event.ctrlKey || event.metaKey || event.code !== "KeyS") return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    toggleSidebar();
}

export { summarizeTopic };

export default definePlugin({
    name: "TopicSummary",
    displayName: "话题 AI 总结",
    description: "在话题页侧栏一键总结全部楼层（可含图片），保留历史记录；支持自定义提示词、自动总结、失败重试与限流退避。",
    tags: ["ai", "reading"],
    icon: SparkIcon,
    enabledByDefault: true,
    settings,
    start() {
        configureEngine({
            prompt: activePrompt,
            maxPosts: () => settings.store.maxPosts,
            filter: () => ({ enabled: settings.store.stripFences, prefixes: lines(settings.store.fencePrefixes), suffixes: lines(settings.store.fenceSuffixes) }),
        });
        syncSidebar(sidebarOptions());
        startupTimer = setTimeout(maybeAutoSummarize, 0);
        document.addEventListener("keydown", onKeydown, true);
    },
    stop() {
        clearTimeout(startupTimer);
        unmountSidebar();
        document.removeEventListener("keydown", onKeydown, true);
    },
    onSettingsChange() {
        syncSidebar(sidebarOptions());
    },
    events: {
        navigate() {
            syncSidebar(sidebarOptions());
            maybeAutoSummarize();
        },
        focusTopic(event) {
            if (event.handled || sidebarTopic() !== event.topicId) return;
            event.handled = true;
            syncSidebar(sidebarOptions(), event.view);
            setSidebarOpen(true);
        },
        pluginToggle({ name }) {
            if (name === "TopicQA" && sidebarTopic()) {
                unmountSidebar();
                syncSidebar(sidebarOptions());
            }
        },
    },
});
