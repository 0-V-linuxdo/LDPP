/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { isPluginEnabled, registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import type { TopicRow } from "../src/api/TopicList";
import PosterAvatars, { AVATAR_CSS, enlargeAvatars, largerAvatar, restoreAvatars } from "../src/plugins/posterAvatars";
import WideLayout, { settings as wideSettings, THIN_HEADER_CSS, WIDE_CSS } from "../src/plugins/wideLayout";

const styleText = (name: string) => document.querySelector<HTMLStyleElement>(`style[data-ldpp-style="${name}"]`)?.textContent ?? null;

describe("发布者头像调整", () => {
    beforeAll(() => registerPlugin(PosterAvatars));
    afterEach(() => {
        stopPlugin(PosterAvatars);
        document.body.innerHTML = "";
    });

    test("asks Discourse for the 48px avatar instead of the 24px one", () => {
        expect(largerAvatar("https://cdn.ldstatic.com/user_avatar/linux.do/someone/24/123_2.png")).toBe("https://cdn.ldstatic.com/user_avatar/linux.do/someone/48/123_2.png");
        expect(largerAvatar("https://cdn.ldstatic.com/user_avatar/linux.do/someone/48/123_2.png")).toBeNull();
    });

    test("enlarges the first poster's avatar and puts the original back when turned off", () => {
        expect(isPluginEnabled("PosterAvatars")).toBe(true);
        startPlugin(PosterAvatars);
        expect(styleText("posterAvatars-layout")).toBe(AVATAR_CSS);
        const tr = document.createElement("tr");
        tr.innerHTML = `<td class="posters topic-list-data"><a class="latest single"><img class="avatar" src="/user_avatar/linux.do/a/24/1.png"></a><a><img class="avatar" src="/user_avatar/linux.do/b/24/2.png"></a></td>`;
        document.body.append(tr);
        enlargeAvatars([{ el: tr } as unknown as TopicRow]);
        const [first, second] = tr.querySelectorAll("img");
        expect(first.getAttribute("src")).toBe("/user_avatar/linux.do/a/48/1.png");
        expect(second.getAttribute("src")).toBe("/user_avatar/linux.do/b/24/2.png");
        stopPlugin(PosterAvatars);
        expect(styleText("posterAvatars-layout")).toBeNull();
        expect(first.getAttribute("src")).toBe("/user_avatar/linux.do/a/24/1.png");
        restoreAvatars();
    });
});

describe("超宽显示与窄顶栏", () => {
    beforeAll(() => registerPlugin(WideLayout));
    afterEach(() => {
        stopPlugin(WideLayout);
        wideSettings.reset("wide");
        wideSettings.reset("thinHeader");
    });

    test("both are on by default and carry the original script's CSS", () => {
        expect(isPluginEnabled("WideLayout")).toBe(true);
        startPlugin(WideLayout);
        expect(styleText("wideLayout-wide")).toBe(WIDE_CSS);
        expect(styleText("wideLayout-thinHeader")).toBe(THIN_HEADER_CSS);
        expect(WIDE_CSS).toContain("--d-max-width: 100% !important;");
        expect(THIN_HEADER_CSS).toContain("height: 2.5em !important;");
    });

    test("each switch works on its own, and turning the plugin off removes both", () => {
        startPlugin(WideLayout);
        wideSettings.store.thinHeader = false;
        expect(styleText("wideLayout-thinHeader")).toBeNull();
        expect(styleText("wideLayout-wide")).toBe(WIDE_CSS);
        wideSettings.store.wide = false;
        expect(styleText("wideLayout-wide")).toBeNull();
        wideSettings.store.wide = true;
        stopPlugin(WideLayout);
        expect(styleText("wideLayout-wide")).toBeNull();
        expect(styleText("wideLayout-thinHeader")).toBeNull();
    });
});
