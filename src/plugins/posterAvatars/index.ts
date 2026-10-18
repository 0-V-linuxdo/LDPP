/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「发布者头像调整」 from the unmaintained 「LinuxDo自定义🛠️」 userscript (greasyfork 499029, avatar_bigger): the first
// poster's avatar in the topic list is shown at 48px, loaded at 48px instead of Discourse's 24px so it stays sharp.
// The original swapped the URLs every 2s; here it runs as a topic-list processor, i.e. whenever rows change.
// That toggle also tweaked the sidebar (link indent, footer rule, a fixed 15em width); those are not avatar
// adjustments and the width now belongs to 「侧边栏宽度」, so they are not carried over.

import { registerProcessor, type TopicRow, unregisterProcessor } from "@api/TopicList";
import { UserCircleIcon } from "@components/icons";
import { registerStyle, unregisterStyle } from "@utils/css";
import definePlugin, { StartAt } from "@utils/types";

const STYLE = "posterAvatars-layout";
const AVATARS = "td.posters.topic-list-data > a:first-child > img, td.posters.topic-list-data > a.latest > img";
/** Marks an avatar whose URL was switched to the 48px size, holding the original for when the plugin is turned off. */
const ORIGINAL = "data-ldpp-avatar-src";

export const AVATAR_CSS = `.topic-list td.topic-list-data.posters {
    height: auto;
    padding: 0.33em;
    width: 110px;
}
.topic-list td.posters.topic-list-data > a:first-child:not([style*="display: none"]) > img {
    width: 48px;
    height: 48px;
}
@media screen and (max-width: 850px) {
    .topic-list .topic-list-data.posters a.latest > img {
        width: 48px;
        height: 48px;
    }
    .topic-list td.topic-list-data.posters {
        width: 52px;
    }
}`;

/** Discourse avatar URLs carry the size as a path segment: …/user_avatar/linux.do/<name>/24/<id>.png. */
export function largerAvatar(src: string): string | null {
    return /\/24\//.test(src) ? src.replace("/24/", "/48/") : null;
}

export function enlargeAvatars(rows: readonly TopicRow[]) {
    for (const row of rows) {
        for (const img of row.el.querySelectorAll<HTMLImageElement>(AVATARS)) {
            const src = img.getAttribute("src") ?? "";
            const next = largerAvatar(src);
            if (!next) continue;
            // Always the current URL: Ember reuses rows, so an older value may belong to another topic's poster.
            img.setAttribute(ORIGINAL, src);
            img.setAttribute("src", next);
        }
    }
}

export function restoreAvatars() {
    for (const img of document.querySelectorAll<HTMLImageElement>(`img[${ORIGINAL}]`)) {
        img.setAttribute("src", img.getAttribute(ORIGINAL) ?? img.src);
        img.removeAttribute(ORIGINAL);
    }
}

export default definePlugin({
    name: "PosterAvatars",
    displayName: "发布者头像调整",
    description: "话题列表里第一位发布者的头像放大到 48px，并加载 48px 的清晰版本（来自「LinuxDo自定义🛠️」脚本）。",
    tags: ["topics"],
    icon: UserCircleIcon,
    enabledByDefault: true,
    startAt: StartAt.Init,
    start() {
        registerStyle(STYLE, AVATAR_CSS);
        registerProcessor({ id: "poster-avatars", run: enlargeAvatars });
    },
    stop() {
        unregisterProcessor("poster-avatars");
        unregisterStyle(STYLE);
        restoreAvatars();
    },
});
