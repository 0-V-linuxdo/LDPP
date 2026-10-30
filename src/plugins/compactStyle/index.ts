/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The small style tweaks of the 「[LINUX DO] Clean Navigation」 user style, one switch each. The style coloured the
// sidebar headings #616161; here they take Discourse's --primary-medium, the same grey in the light theme that also
// reads in the dark one.

import { definePluginSettings } from "@api/Settings";
import { MinimizeIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import definePlugin, { OptionType, StartAt } from "@utils/types";

const STYLE = "compactStyle";

export const PARTS = {
    sidebarHeadings: `span.sidebar-section-header-text {
    color: var(--primary-medium);
    font-size: 15px;
    font-weight: 451;
}`,
    sidebarSections: `div.sidebar-sections {
    padding: 0 !important;
}
div.sidebar-section.sidebar-section-wrapper {
    border-style: none;
}`,
    searchBanner: `div.wrap.custom-search-banner-wrap {
    padding: 0;
}`,
    timerHeading: `h3.topic-timer-heading {
    font-weight: 100;
    font-style: normal;
    font-size: 14px;
    padding-bottom: 0;
}`,
} as const;

export type Part = keyof typeof PARTS;

export const settings = definePluginSettings({
    sidebarHeadings: { type: OptionType.BOOLEAN, description: "侧栏分区标题改为灰色、15px", default: true },
    sidebarSections: { type: OptionType.BOOLEAN, description: "侧栏去掉外边距和分区之间的分隔线", default: true },
    searchBanner: { type: OptionType.BOOLEAN, description: "首页搜索横幅去掉内边距", default: true },
    timerHeading: { type: OptionType.BOOLEAN, description: "话题计时器（如「将于 … 关闭」）的标题改为细体小字", default: true },
});

/** The stylesheet for the parts switched on; empty when none is. */
export function compactCss(parts: readonly Part[]): string {
    return parts.map(part => PARTS[part]).join("\n");
}

let active = false;

function apply() {
    const parts = (Object.keys(PARTS) as Part[]).filter(part => settings.store[part]);
    const css = active ? compactCss(parts) : "";
    if (css) registerStyle(STYLE, css);
    else unregisterStyle(STYLE);
}

export default definePlugin({
    name: "CompactStyle",
    displayName: "紧凑样式",
    description: "侧栏标题变灰变小、去掉侧栏边距和分隔线、搜索横幅去内边距、计时器标题改细体，每项单独开关（来自「Clean Navigation」样式）。",
    tags: ["reading"],
    icon: MinimizeIcon,
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
