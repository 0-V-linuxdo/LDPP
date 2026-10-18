/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeAll, describe, expect, test } from "bun:test";

import { isPluginEnabled, registerPlugin, startPlugin, stopPlugin } from "../src/api/PluginManager";
import type { TopicRow } from "../src/api/TopicList";
import CreatedTime, { ageOf, createdSortUrl, formatCreated, HEADER_CSS, parseCreated, settings as createdSettings, showCreatedTimes } from "../src/plugins/createdTime";
import DisableAutoplay, { quiet, withoutAutoplay } from "../src/plugins/disableAutoplay";
import PanguSpacing, { spaceMarkdown } from "../src/plugins/panguSpacing";

const DAY = 24 * 60 * 60 * 1000;
const styleText = (name: string) => document.querySelector<HTMLStyleElement>(`style[data-ldpp-style="${name}"]`)?.textContent ?? null;

describe("话题列表显示创建时间", () => {
    beforeAll(() => registerPlugin(CreatedTime));
    afterEach(() => {
        stopPlugin(CreatedTime);
        createdSettings.reset("position");
        document.body.innerHTML = "";
    });

    test("reads the creation time from the activity cell's tooltip, in Chinese or English", () => {
        expect(parseCreated("创建日期：2026 年 10月 2 日 19:46\n最新：2026 年 10月 5 日 05:54")).toBe(new Date(2026, 9, 2, 19, 46).getTime());
        expect(parseCreated("Created: Oct 2, 2026 7:46 pm\nLatest: Oct 5, 2026 5:54 am")).toBe(new Date(2026, 9, 2, 19, 46).getTime());
        expect(parseCreated("Created: Jan 1, 2025 12:05 am")).toBe(new Date(2025, 0, 1, 0, 5).getTime());
        expect(parseCreated("最新：刚刚")).toBeNull();
    });

    test("formats and colours like the original: time today, month/day this year, the year before that", () => {
        const now = new Date(2026, 9, 5, 12, 0).getTime();
        expect(formatCreated(new Date(2026, 9, 5, 8, 3).getTime(), now)).toBe("08:03");
        expect(formatCreated(new Date(2026, 9, 2, 19, 46).getTime(), now)).toBe("10/02 19:46");
        expect(formatCreated(new Date(2025, 11, 31, 23, 59).getTime(), now)).toBe("2025/12/31 23:59");
        expect([0.5, 3, 20, 60, 200].map(days => ageOf(now - days * DAY, now))).toEqual(["day", "week", "month", "quarter", "old"]);
    });

    test("replaces the view count by default, moves after the activity time on request, and leaves Discourse's nodes", () => {
        expect(isPluginEnabled("CreatedTime")).toBe(true);
        const created = new Date(Date.now() - 200 * DAY);
        const stamp = `${created.getFullYear()} 年 ${created.getMonth() + 1}月 ${created.getDate()} 日 08:30`;
        const tr = document.createElement("tr");
        tr.className = "topic-list-item";
        tr.innerHTML = `<td class="num views topic-list-data"><span class="number" title="此话题已被浏览 10,602 次">10.6k</span></td><td class="activity num topic-list-data age" title="创建日期：${stamp}\n最新：…"><a class="post-activity"><span class="relative-date">4 分钟</span></a></td>`;
        document.body.append(tr);
        const row = { el: tr } as unknown as TopicRow;
        startPlugin(CreatedTime);
        showCreatedTimes([row]);
        const inViews = tr.querySelector("td.views .ldpp-created-time");
        expect(inViews?.classList.contains("is-old")).toBe(true);
        expect(inViews?.querySelector(".ldpp-created-tomb")).not.toBeNull();
        expect(inViews?.getAttribute("title")).toContain("此话题已被浏览 10,602 次");
        expect(tr.querySelector("td.views .number")?.textContent).toBe("10.6k");
        createdSettings.store.position = "activity";
        showCreatedTimes([row]);
        expect(tr.querySelector("td.views .ldpp-created-time")).toBeNull();
        expect(tr.querySelector("td.activity .ldpp-created-time")?.textContent).toMatch(/^（.+ 08:30）$/);
        stopPlugin(CreatedTime);
        expect(tr.querySelector(".ldpp-created-time")).toBeNull();
    });

    test("replacing the view count also turns its header into 「创建时间」, sorting by creation time", () => {
        startPlugin(CreatedTime);
        expect(styleText("createdTime-header")).toBe(HEADER_CSS);
        expect(HEADER_CSS).toContain('content: "创建时间"');
        createdSettings.store.position = "activity";
        expect(styleText("createdTime-header")).toBeNull();
        createdSettings.store.position = "views";
        expect(styleText("createdTime-header")).toBe(HEADER_CSS);
        stopPlugin(CreatedTime);
        expect(styleText("createdTime-header")).toBeNull();
    });

    test("the header sorts newest first, then toggles to oldest first, as Discourse's own headers do", () => {
        expect(createdSortUrl("https://linux.do/latest")).toBe("/latest?ascending=false&order=created");
        expect(createdSortUrl("https://linux.do/latest?ascending=false&order=views")).toBe("/latest?ascending=false&order=created");
        expect(createdSortUrl("https://linux.do/latest?order=created")).toBe("/latest?order=created&ascending=true");
        expect(createdSortUrl("https://linux.do/c/dev/4?ascending=true&order=created")).toBe("/c/dev/4?ascending=false&order=created");
    });
});

describe("中英文混排优化", () => {
    beforeAll(() => registerPlugin(PanguSpacing));

    test("spaces prose but keeps Markdown syntax byte for byte", () => {
        expect(isPluginEnabled("PanguSpacing")).toBe(true);
        expect(spaceMarkdown("用Claude写代码")).toBe("用 Claude 写代码");
        expect(spaceMarkdown("运行`npm i`安装")).toBe("运行 `npm i` 安装");
        expect(spaceMarkdown("看[文档](https://example.com/a中文b)吧")).toContain("](https://example.com/a中文b)");
        expect(spaceMarkdown("![截图2|690x388](upload://abc123.png)")).toBe("![截图2|690x388](upload://abc123.png)");
        expect(spaceMarkdown("[details=\"折叠abc\"]\n内容abc\n[/details]")).toBe("[details=\"折叠abc\"]\n内容 abc\n[/details]");
        expect(spaceMarkdown("好的:smile:收到")).toContain(":smile:");
        const fence = "```js\nconst a=\"中文abc\";\n```\n说明abc";
        expect(spaceMarkdown(fence)).toBe("```js\nconst a=\"中文abc\";\n```\n说明 abc");
        expect(spaceMarkdown("访问https://linux.do获取")).toBe("访问 https://linux.do 获取");
    });

    test("adds 「混排优化」 after the composer's create button, and clicking it spaces the draft", () => {
        document.body.innerHTML = `<div id="reply-control"><input id="reply-title" value="Claude发布了5个模型"><textarea class="d-editor-input">用\`npm\`安装Claude</textarea><div class="save-or-cancel"><button class="create">创建话题</button><button class="discard-button">舍弃</button></div></div>`;
        startPlugin(PanguSpacing);
        const button = document.querySelector<HTMLButtonElement>(".save-or-cancel .create + .ldpp-pangu-button");
        expect(button?.textContent).toBe("混排优化");
        button!.click();
        expect(document.querySelector<HTMLInputElement>("#reply-title")!.value).toBe("Claude 发布了 5 个模型");
        expect(document.querySelector<HTMLTextAreaElement>(".d-editor-input")!.value).toBe("用 `npm` 安装 Claude");
        stopPlugin(PanguSpacing);
        expect(document.querySelector(".ldpp-pangu-button")).toBeNull();
        document.body.innerHTML = "";
    });
});

describe("禁用视频自动播放", () => {
    beforeAll(() => registerPlugin(DisableAutoplay));
    afterEach(() => {
        stopPlugin(DisableAutoplay);
        document.body.innerHTML = "";
    });

    test("turns autoplay off in the embed URL, once", () => {
        expect(withoutAutoplay("https://player.bilibili.com/player.html?bvid=BV1X7PGe9Era")).toBe("https://player.bilibili.com/player.html?bvid=BV1X7PGe9Era&autoplay=0");
        expect(withoutAutoplay("//player.bilibili.com/player.html?bvid=BV1&autoplay=1")).toBe("//player.bilibili.com/player.html?bvid=BV1&autoplay=0");
        expect(withoutAutoplay("https://www.youtube.com/embed/abc?autoplay=0")).toBeNull();
        expect(withoutAutoplay("https://player.bilibili.com/player.html?autoplay=false")).toBeNull();
    });

    test("quiets players in posts, but not one the user just clicked to load", () => {
        expect(isPluginEnabled("DisableAutoplay")).toBe(true);
        document.body.innerHTML = `<div class="cooked"><iframe src="https://player.bilibili.com/player.html?bvid=BV1"></iframe></div><div class="cooked" id="clicked"><div class="lazy-video-container"><img></div></div>`;
        startPlugin(DisableAutoplay);
        expect(document.querySelector("iframe")?.getAttribute("src")).toContain("autoplay=0");
        const clicked = document.getElementById("clicked")!;
        clicked.querySelector("img")!.dispatchEvent(new window.Event("pointerdown", { bubbles: true }) as unknown as Event);
        const lazy = document.createElement("iframe");
        lazy.setAttribute("src", "https://www.youtube.com/embed/abc?autoplay=1");
        clicked.querySelector(".lazy-video-container")!.replaceChildren(lazy);
        quiet(lazy);
        expect(lazy.getAttribute("src")).toBe("https://www.youtube.com/embed/abc?autoplay=1");
    });
});
