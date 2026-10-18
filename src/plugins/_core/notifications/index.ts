/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { configureToasts, showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { BellIcon } from "@components/icons";
import definePlugin, { OptionType, StartAt } from "@utils/types";

export const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "显示 Toast 通知（错误提示始终显示）。",
        default: true,
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
    displayName: "通知",
    description: "Toast 通知的开关与自动关闭时长。",
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
        }));
    },
});
