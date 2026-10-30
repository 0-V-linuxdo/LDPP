/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The hide switches of the 「[LINUX DO] Clean Navigation」 user style: buttons, tabs and banners some people never use,
// each with its own switch. Pure CSS, registered at document start so they never flash in.

import { definePluginSettings } from "@api/Settings";
import { EyeClosedIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import definePlugin, { OptionType, StartAt } from "@utils/types";

const STYLE = "hideElements";

export const PARTS = {
    headerCreate: "button.header-create-topic",
    languageSwitcher: "button.language-switcher-trigger",
    themeToggle: "div.sidebar-theme-toggle__wrapper",
    globalNotice: "div.alert.alert-info.alert-global-notice",
    navCreate: ".navigation-controls #create-topic",
    dismissRead: ".navigation-controls .dismiss-container-top .dismiss-read",
    postedTab: "#navigation-bar > li.posted.nav-item_posted",
    outlets: "[class*='discovery-list-container-top-outlet'], [class*='topic-above-post-stream-outlet'], [class*='topic-above-suggested-outlet']",
} as const;

export type Part = keyof typeof PARTS;

export const settings = definePluginSettings({
    headerCreate: { type: OptionType.BOOLEAN, description: "顶栏：隐藏「新建话题」按钮", default: true },
    languageSwitcher: { type: OptionType.BOOLEAN, description: "顶栏：隐藏语言切换按钮", default: true },
    themeToggle: { type: OptionType.BOOLEAN, description: "侧栏：隐藏底部的主题切换", default: true },
    globalNotice: { type: OptionType.BOOLEAN, description: "隐藏搜索框上方的全站公告（社区准则提示）", default: true },
    navCreate: { type: OptionType.BOOLEAN, description: "导航栏：隐藏「新建话题」按钮", default: true },
    dismissRead: { type: OptionType.BOOLEAN, description: "导航栏：隐藏「忽略」已读按钮", default: true },
    postedTab: { type: OptionType.BOOLEAN, description: "导航栏：隐藏「我的帖子」标签", default: true },
    outlets: { type: OptionType.BOOLEAN, description: "隐藏话题列表顶部和帖子上方、推荐话题上方的插件位（站点放公告、活动的位置）", default: true },
});

/** The stylesheet for the parts switched on; empty when none is. */
export function hideCss(parts: readonly Part[]): string {
    if (!parts.length) return "";
    return `${parts.map(part => PARTS[part]).join(",\n")} {
    display: none !important;
}`;
}

let active = false;

function apply() {
    const parts = (Object.keys(PARTS) as Part[]).filter(part => settings.store[part]);
    const css = active ? hideCss(parts) : "";
    if (css) registerStyle(STYLE, css);
    else unregisterStyle(STYLE);
}

export default definePlugin({
    name: "HideElements",
    displayName: "隐藏界面元素",
    description: "隐藏顶栏、侧栏、导航栏里用不到的按钮、标签和公告，每项单独开关（来自「Clean Navigation」样式）。",
    tags: ["reading"],
    icon: EyeClosedIcon,
    enabledByDefault: false,
    startAt: StartAt.Init,
    settings,
    start() {
        active = true;
        apply();
    },
    stop() {
        active = false;
        apply();
    },
    onSettingsChange: apply,
});
