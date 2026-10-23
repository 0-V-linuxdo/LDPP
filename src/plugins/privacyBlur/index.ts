/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s StreamerMode and NoSidebarIdentity for linux.do: blurs what ties a screenshot or a shared screen to you,
// each part with its own switch. Hovering a blurred part shows it while the pointer is there. The other half of
// screenshot privacy, the site's hidden watermarks, is 「去除隐藏水印」.

import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { EyeOffIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import { gmMenu } from "@utils/gm";
import definePlugin, { OptionType } from "@utils/types";

const STYLE = "privacyBlur";

export const PARTS = {
    headerAvatar: ".d-header .current-user img.avatar, .d-header .header-dropdown-toggle.current-user img",
    badges: ".d-header .badge-notification, .d-header .unread-notifications, .d-header .unread-high-priority-notifications, .sidebar-section-link-content-badge, .sidebar-section-link-suffix.unread",
    userMenu: ".user-menu .quick-access-panel li, .user-menu .panel-body-contents li",
    messages: ".sidebar-section[data-section-name='messages'] .sidebar-section-content, .sidebar-section[data-section-name='user-messages'] .sidebar-section-content",
    ownPosts: ".topic-post.current-user-post .topic-avatar img.avatar, .topic-post.current-user-post .names, .topic-post.current-user-post .post-avatar img.avatar",
} as const;

export type Part = keyof typeof PARTS;

export const settings = definePluginSettings({
    headerAvatar: { type: OptionType.BOOLEAN, description: "模糊顶栏自己的头像。", default: true },
    badges: { type: OptionType.BOOLEAN, description: "模糊顶栏和侧栏的未读 / 通知数。", default: true },
    userMenu: { type: OptionType.BOOLEAN, description: "模糊用户菜单里的通知、私信、书签列表。", default: true },
    messages: { type: OptionType.BOOLEAN, description: "模糊侧栏的私信分区。", default: true },
    ownPosts: { type: OptionType.BOOLEAN, description: "模糊话题里自己楼层的头像和用户名。", default: false },
    strength: { type: OptionType.SLIDER, description: "模糊程度", min: 2, max: 16, step: 1, unit: "px", default: 6 },
});

/** The stylesheet for the parts switched on; empty when none is. */
export function privacyCss(parts: readonly Part[], strength: number): string {
    if (!parts.length) return "";
    const selectors = parts.map(part => PARTS[part]).join(",\n");
    const hovered = parts.flatMap(part => PARTS[part].split(", ").map(selector => `${selector}:hover`)).join(",\n");
    return `${selectors} {
    filter: blur(${strength}px) !important;
    transition: filter 0.15s ease;
}
${hovered} {
    filter: none !important;
}`;
}

let active = false;
let paused = false;
let menuAdded = false;

function apply() {
    const parts = (Object.keys(PARTS) as Part[]).filter(part => settings.store[part]);
    const css = active && !paused ? privacyCss(parts, settings.store.strength) : "";
    if (css) registerStyle(STYLE, css);
    else unregisterStyle(STYLE);
}

function togglePause() {
    if (!active) return;
    paused = !paused;
    apply();
    showToast(paused ? "隐私打码已暂停，直到再次切换或刷新页面" : "隐私打码已恢复", "info", { key: "privacy-blur" });
}

export default definePlugin({
    name: "PrivacyBlur",
    displayName: "隐私打码",
    description: "模糊自己的头像、未读数、用户菜单和私信等可识别信息，悬停时临时显示；脚本菜单可一键暂停（对照 Void++ StreamerMode）。",
    tags: ["privacy"],
    icon: EyeOffIcon,
    enabledByDefault: false,
    settings,
    start() {
        active = true;
        paused = false;
        if (!menuAdded) {
            menuAdded = true;
            gmMenu("🙈 暂停 / 恢复隐私打码", togglePause);
        }
        apply();
    },
    stop() {
        active = false;
        apply();
    },
    onSettingsChange: apply,
});
