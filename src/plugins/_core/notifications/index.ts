/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { applyToastStyle, configureToasts, showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { configureTopicFocus } from "@api/TopicList";
import { BellIcon } from "@components/icons";
import definePlugin, { OptionType, StartAt } from "@utils/types";

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "显示 Toast 通知（错误提示始终显示）。",
        default: true,
    },
    style: {
        type: OptionType.SELECT,
        description: "通知外观",
        options: [
            { label: "LD++（跟随站点配色，左侧圆点标示类型）", value: "ldpp", default: true },
            { label: "原总结脚本（按类型着色的卡片，白字）", value: "classic" },
        ],
    },
    infoSeconds: {
        type: OptionType.SLIDER,
        description: "「信息」通知自动关闭秒数，0 表示不自动关闭。",
        min: 0,
        max: 30,
        default: 3,
    },
    successSeconds: {
        type: OptionType.SLIDER,
        description: "「成功」通知自动关闭秒数。",
        min: 0,
        max: 30,
        default: 4,
    },
    warningSeconds: {
        type: OptionType.SLIDER,
        description: "「警告」通知自动关闭秒数。",
        min: 0,
        max: 30,
        default: 6,
    },
    errorSeconds: {
        type: OptionType.SLIDER,
        description: "「错误」通知自动关闭秒数，默认常驻。",
        min: 0,
        max: 60,
        default: 0,
    },
    clickJump: {
        type: OptionType.SELECT,
        description: "点击话题通知后的跳转效果",
        options: [
            { label: "LD++（平滑滚动、底色闪烁；找不到时站内打开话题）", value: "ldpp", default: true },
            { label: "原总结脚本（直接跳到该行、按通知颜色描边 3 秒；找不到时整页打开，在其他话题页则不跳转）", value: "classic" },
        ],
    },
    clickExpands: {
        type: OptionType.BOOLEAN,
        description: "点击话题通知时，在列表中定位并展开该话题的总结。",
        default: true,
    },
    clickOpensSidebar: {
        type: OptionType.BOOLEAN,
        description: "在话题页点击当前话题的通知时，打开侧栏。",
        default: true,
    },
});

export function previewToasts() {
    showToast("这是一条信息通知", "info");
    showToast("这是一条成功通知", "success");
    showToast("这是一条警告通知", "warning");
    showToast("这是一条错误通知", "error");
}

export default definePlugin({
    name: "Notifications",
    displayName: "通知设置",
    description: "所有功能共用的通知设置：外观、自动关闭时长、点击话题通知后的跳转。必需，关不掉；不想看通知请在设置里关闭「显示 Toast 通知」。",
    tags: ["core"],
    icon: BellIcon,
    required: true,
    startAt: StartAt.Init,
    settings,
    start() {
        configureToasts(() => ({
            enabled: settings.store.enabled,
            durations: {
                info: settings.store.infoSeconds,
                success: settings.store.successSeconds,
                warning: settings.store.warningSeconds,
                error: settings.store.errorSeconds,
            },
            style: settings.store.style === "classic" ? "classic" : "ldpp",
        }));
        configureTopicFocus(() => ({
            jump: settings.store.clickJump === "classic" ? "classic" : "ldpp",
            openSidebar: settings.store.clickOpensSidebar,
        }));
        applyToastStyle();
    },
    onSettingsChange() {
        applyToastStyle();
    },
});
