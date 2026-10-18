/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「超宽显示」 and 「窄的顶栏」 from the unmaintained 「LinuxDo自定义🛠️」 userscript (greasyfork 499029, wider_page /
// thin_header): pure CSS, kept as the script had it, one switch each. Registered at document start so the page does
// not first draw at the normal width.

import { definePluginSettings } from "@api/Settings";
import { WideIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import definePlugin, { OptionType, StartAt } from "@utils/types";

const WIDE_STYLE = "wideLayout-wide";
const THIN_STYLE = "wideLayout-thinHeader";

export const WIDE_CSS = `#main-outlet-wrapper {
    max-width: 100% !important;
}
body.has-sidebar-page header.d-header > div.wrap {
    max-width: 100% !important;
}
.topic-body {
    width: 100% !important;
}
:root {
    --d-max-width: 100% !important;
}
article .topic-map.--op {
    max-width: 100%;
}
div#reply-control .reply-area {
    width: calc(100% - 2em);
}
@media screen and (min-width: 925px) {
    #main-outlet .container.posts {
        grid-template-columns: auto 120px;
    }
}`;

export const THIN_HEADER_CSS = `.d-header {
    height: 2.5em !important;
}
.d-header .extra-info-wrapper .title-wrapper {
    display: flex;
    flex-direction: row;
}
.d-header div.title-wrapper > h1.header-title {
    width: auto;
    font-size: large;
}
.d-header #site-logo {
    height: 2em !important;
}
.d-header .d-header-icons .icon img.avatar {
    height: 2em !important;
}`;

export const settings = definePluginSettings({
    wide: {
        type: OptionType.BOOLEAN,
        description: "超宽显示：页面内容铺满整个窗口宽度",
        default: true,
    },
    thinHeader: {
        type: OptionType.BOOLEAN,
        description: "窄的顶栏：顶栏高度降为 2.5em，标题与站点图标随之缩小",
        default: true,
    },
});

function apply() {
    if (settings.store.wide !== false) registerStyle(WIDE_STYLE, WIDE_CSS);
    else unregisterStyle(WIDE_STYLE);
    if (settings.store.thinHeader !== false) registerStyle(THIN_STYLE, THIN_HEADER_CSS);
    else unregisterStyle(THIN_STYLE);
}

export default definePlugin({
    name: "WideLayout",
    displayName: "超宽显示与窄顶栏",
    description: "页面内容铺满窗口宽度，顶栏变窄，两项可分别开关（来自「LinuxDo自定义🛠️」脚本）。",
    tags: ["reading"],
    icon: WideIcon,
    enabledByDefault: true,
    startAt: StartAt.Init,
    settings,
    start: apply,
    stop() {
        unregisterStyle(WIDE_STYLE);
        unregisterStyle(THIN_STYLE);
    },
    onSettingsChange: apply,
});
