/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s CustomSidebarIdentity for linux.do: your own avatar and name, shown only in your browser. The avatar is
// replaced wherever Discourse shows yours (header, user menu, floors, topic lists, user cards), recognised by the
// username in its URL; the name in your own floors. Hiding them instead is 「隐私打码」.

import "./styles.css";

import { definePluginSettings } from "@api/Settings";
import { UserRoundPenIcon } from "@components/icons";
import { currentAccount } from "@plugins/noWatermark/detect";
import { registerStyle, unregisterStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

import { AvatarEditor, type AvatarStore } from "./editor";
import { MARK, paintIdentity, restoreIdentity, usableAvatar } from "./paint";

const SIZE_STYLE = "customIdentity-size";
const SIZE_DEFAULT = 32;

export const settings = definePluginSettings({
    avatar: {
        type: OptionType.COMPONENT,
        description: "头像",
        render: (): HTMLElement => AvatarEditor(settings.store as unknown as AvatarStore),
    },
    displayName: {
        type: OptionType.STRING,
        description: "显示名：替换话题楼层里自己的名字，留空保持原样。",
        placeholder: "楼层里显示的名字",
        default: "",
    },
    everywhere: {
        type: OptionType.BOOLEAN,
        description: "头像也替换话题楼层、列表、用户卡片等处（关闭则只换顶栏和用户菜单）。",
        default: true,
    },
    headerSize: {
        type: OptionType.SLIDER,
        description: "顶栏头像大小（站点默认 32px）",
        min: 24,
        max: 44,
        step: 1,
        unit: "px",
        default: SIZE_DEFAULT,
    },
    avatarUrl: { type: OptionType.CUSTOM, default: "" },
    avatarLink: { type: OptionType.CUSTOM, default: "" },
    avatarSource: { type: OptionType.CUSTOM, default: "" },
    cropX: { type: OptionType.CUSTOM, default: 0.5 },
    cropY: { type: OptionType.CUSTOM, default: 0.5 },
    cropZoom: { type: OptionType.CUSTOM, default: 1 },
});

let active = false;
let observer: MutationObserver | null = null;
let frame = 0;

function apply() {
    if (!active) return;
    const username = currentAccount()?.username.toLowerCase();
    if (!username) return;
    paintIdentity(document, {
        username,
        avatar: usableAvatar(String(settings.store.avatarUrl ?? "")),
        name: settings.store.displayName.trim(),
        everywhere: settings.store.everywhere,
    });
}

function applySize() {
    const size = Math.round(settings.store.headerSize);
    if (!active || size === SIZE_DEFAULT) {
        unregisterStyle(SIZE_STYLE);
        return;
    }
    registerStyle(SIZE_STYLE, `.d-header .header-dropdown-toggle.current-user img.avatar {
    width: ${size}px !important;
    height: ${size}px !important;
}`);
}

function schedule() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        apply();
    });
}

function onMutations(mutations: MutationRecord[]) {
    for (const mutation of mutations) {
        if (mutation.type === "childList") return schedule();
        // A src change on an avatar: Discourse loading another one, or one of ours being put back.
        const el = mutation.target as Element;
        if (el.hasAttribute(MARK) || el.getAttribute("src")?.includes("/user_avatar/")) return schedule();
    }
}

export default definePlugin({
    name: "CustomIdentity",
    displayName: "自定义头像与名字",
    description: "把自己的头像换成任意图片（网址、粘贴或拖入，可拖动缩放裁剪），把楼层里的名字换成自定义显示名，还能调顶栏头像大小；只在你的浏览器里显示，别人看到的不变（对照 Void++ CustomSidebarIdentity）。",
    tags: ["privacy"],
    icon: UserRoundPenIcon,
    enabledByDefault: false,
    settings,
    managedStyle: "customIdentity",
    start() {
        active = true;
        observer = new MutationObserver(onMutations);
        observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });
        applySize();
        apply();
    },
    stop() {
        active = false;
        observer?.disconnect();
        observer = null;
        cancelAnimationFrame(frame);
        frame = 0;
        applySize();
        restoreIdentity(document);
    },
    onSettingsChange() {
        applySize();
        apply();
    },
});
