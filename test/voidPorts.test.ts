/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { tabState } from "../src/plugins/completionAlert";
import { avatarOwner, cropRect, paintIdentity, restoreIdentity } from "../src/plugins/customIdentity/paint";
import { stampPosts } from "../src/plugins/postTimestamps";
import { privacyCss } from "../src/plugins/privacyBlur";
import { floorOf, initialIndex, normalizeRecent, patchRecent, summaryExcerpt, timeAgo, touchRecent, wrapIndex } from "../src/plugins/recentTopics/model";
import { cookedToMarkdown, exportFileName, renderExport } from "../src/plugins/topicExport/format";
import { HistoryCursor, onFirstLine, pushHistory } from "../src/plugins/topicQA/history";

describe("topic export", () => {
    test("cooked HTML becomes Markdown", () => {
        const md = cookedToMarkdown(`<p>Hello <strong>bold</strong> and <em>it</em> with <code>x</code> <a href="/t/topic/1">link</a> <img src="/images/emoji/twitter/smile.png" class="emoji" alt=":smile:"></p>
<ul><li>one</li><li>two</li></ul>
<pre><code class="lang-js">const a = 1;
</code></pre>
<aside class="quote" data-username="alice"><div class="title">alice:</div><blockquote><p>quoted</p></blockquote></aside>
<h2>Title</h2>
<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>`);
        expect(md).toContain("Hello **bold** and *it* with `x` [link](https://linux.do/t/topic/1) :smile:");
        expect(md).toContain("- one\n- two");
        expect(md).toContain("```js\nconst a = 1;\n```");
        expect(md).toContain("> **alice：**\n> quoted");
        expect(md).toContain("## Title");
        expect(md).toContain("| A | B |\n| --- | --- |\n| 1 | 2 |");
    });

    test("lightbox images keep the full-size link and drop the meta line", () => {
        const md = cookedToMarkdown(`<p><div class="lightbox-wrapper"><a class="lightbox" href="https://cdn.example/full.png"><img src="https://cdn.example/small.png" alt="pic"><div class="meta">pic 1920×1080 300 KB</div></a></div></p>`);
        expect(md).toBe("![pic](https://cdn.example/full.png)");
    });

    test("every format carries the floors, and the summary when given", () => {
        const topic = {
            topicId: "42",
            title: "测试话题",
            url: "https://linux.do/t/topic/42",
            posts: [
                { id: 1, post_number: 1, username: "alice", name: "Alice", created_at: "2026-10-01T10:00:00Z", cooked: "<p>first</p>" },
                { id: 2, post_number: 2, username: "bob", created_at: "2026-10-01T11:00:00Z", cooked: "<p>second</p>", reply_to_user: { username: "alice" } },
            ],
            summary: "总结内容",
            exportedAt: new Date("2026-10-23T00:00:00Z"),
        };
        const md = renderExport(topic, "md");
        expect(md).toStartWith("# 测试话题");
        expect(md).toContain("## AI 总结\n\n总结内容");
        expect(md).toContain("### #2 @bob 回复 @alice");
        expect(renderExport(topic, "txt")).toContain("#1 Alice（@alice）");
        expect(renderExport(topic, "html")).toContain("<article class=\"post\" id=\"post-2\">");
        expect(JSON.parse(renderExport(topic, "json")).posts[1].markdown).toBe("second");
    });

    test("file names drop characters file systems reject", () => {
        expect(exportFileName({ topicId: "7", title: "a/b:c?" }, "md")).toBe("a b c-7.md");
    });
});

describe("post timestamps", () => {
    test("writes the exact time after each relative date, once", () => {
        const time = new Date(2026, 9, 23, 19, 46).getTime();
        document.body.innerHTML = `<article class="topic-post"><div class="post-info post-date"><a class="post-date"><span class="relative-date" data-time="${time}">3 小时</span></a></div></article>`;
        stampPosts(document, new Date(2026, 9, 23, 22, 0).getTime());
        stampPosts(document, new Date(2026, 9, 23, 22, 0).getTime());
        const spans = document.querySelectorAll(".ldpp-post-time");
        expect(spans.length).toBe(1);
        expect(spans[0].textContent).toBe("19:46");
        stampPosts(document, new Date(2026, 9, 25).getTime());
        expect(document.querySelector(".ldpp-post-time")?.textContent).toBe("10/23 19:46");
    });
});

describe("privacy blur", () => {
    test("only the parts switched on are blurred, and hover shows them", () => {
        expect(privacyCss([], 6)).toBe("");
        const css = privacyCss(["headerAvatar"], 8);
        expect(css).toContain("blur(8px)");
        expect(css).toContain(".d-header .current-user img.avatar:hover");
        expect(css).not.toContain("current-user-post");
    });
});

describe("question history", () => {
    test("newest first, no repeats, limited", () => {
        expect(pushHistory(["b", "a"], "a", 5)).toEqual(["a", "b"]);
        expect(pushHistory(["b", "a"], "c", 2)).toEqual(["c", "b"]);
        expect(pushHistory(["a"], "  ", 5)).toEqual(["a"]);
    });

    test("the cursor steps through and comes back to the draft", () => {
        const cursor = new HistoryCursor(() => ["newest", "older"]);
        expect(cursor.newer()).toBeNull();
        expect(cursor.older("draft")).toBe("newest");
        expect(cursor.older("newest")).toBe("older");
        expect(cursor.older("older")).toBeNull();
        expect(cursor.newer()).toBe("newest");
        expect(cursor.newer()).toBe("draft");
        expect(cursor.older("draft")).toBe("newest");
        expect(cursor.restore()).toBe("draft");
        expect(cursor.browsing).toBe(false);
    });

    test("↑ only takes over on the first line", () => {
        const area = document.createElement("textarea");
        area.value = "line 1\nline 2";
        area.setSelectionRange(3, 3);
        expect(onFirstLine(area)).toBe(true);
        area.setSelectionRange(10, 10);
        expect(onFirstLine(area)).toBe(false);
    });
});

describe("recent topics", () => {
    test("a visit moves the topic to the front and keeps what was known", () => {
        let list = touchRecent([], { id: "1", title: "One", floor: 5 }, 100);
        list = touchRecent(list, { id: "2", title: "Two" }, 200);
        list = touchRecent(list, { id: "1" }, 300);
        expect(list.map(item => item.id)).toEqual(["1", "2"]);
        expect(list[0]).toEqual({ id: "1", title: "One", floor: 5, visitedAt: 300 });
        expect(patchRecent(list, "2", { floor: 9 })[1].floor).toBe(9);
    });

    test("stored lists are cleaned and sorted", () => {
        expect(normalizeRecent([{ id: "x" }, { id: "3", visitedAt: 1 }, { id: "4", visitedAt: 2 }, { id: "3", visitedAt: 5 }]).map(item => item.id)).toEqual(["4", "3"]);
        expect(normalizeRecent("nope")).toEqual([]);
    });

    test("helpers", () => {
        expect(floorOf("/t/some-slug/123/45")).toBe(45);
        expect(floorOf("/t/some-slug/123")).toBe(0);
        const list = touchRecent(touchRecent([], { id: "1" }, 1), { id: "2" }, 2);
        expect(initialIndex(list, "2")).toBe(1);
        expect(initialIndex(list, null)).toBe(0);
        expect(wrapIndex(-1, 3)).toBe(2);
        expect(timeAgo(0, 30_000)).toBe("刚刚");
        expect(timeAgo(0, 5 * 60_000)).toBe("5 分钟前");
        expect(summaryExcerpt("## 标题\n**要点** [链接](https://x) `code`", 50)).toBe("标题 要点 链接 code");
    });
});

describe("completion alert", () => {
    test("running wins, then the background result, then idle", () => {
        expect(tabState(1, "done")).toBe("running");
        expect(tabState(0, "error")).toBe("error");
        expect(tabState(0, null)).toBe("idle");
    });
});

describe("custom identity", () => {
    const identity = { username: "alice", avatar: "data:image/png;base64,AAAA", name: "爱丽丝", everywhere: true };
    const page = () => {
        document.body.innerHTML = `
<header class="d-header"><div class="header-dropdown-toggle current-user"><img class="avatar" src="https://linux.do/user_avatar/linux.do/Alice/48/1_2.png" srcset="https://linux.do/user_avatar/linux.do/Alice/96/1_2.png 2x"></div></header>
<article class="topic-post"><div class="topic-avatar"><img class="avatar" src="https://cdn.linux.do/user_avatar/linux.do/alice/48/1_2.png"></div>
  <div class="names"><span class="first username"><a href="/u/alice" data-user-card="alice">alice</a></span><span class="second full-name"><a href="/u/alice" data-user-card="alice">Alice</a></span><span class="user-title">Lv3</span></div></article>
<article class="topic-post"><div class="topic-avatar"><img class="avatar" src="https://linux.do/user_avatar/linux.do/bob/48/2_2.png"></div>
  <div class="names"><span class="first username"><a href="/u/bob" data-user-card="bob">bob</a></span></div></article>`;
    };

    test("owner comes from the avatar URL, any case", () => {
        expect(avatarOwner("https://linux.do/user_avatar/linux.do/Alice/48/1_2.png")).toBe("alice");
        expect(avatarOwner("https://linux.do/letter_avatar_proxy/v4/letter/a/b/48.png")).toBeNull();
    });

    test("crop stays inside the picture", () => {
        expect(cropRect(200, 100, 1, 0, 0)).toEqual({ z: 1, side: 100, x: 50, y: 50 });
        expect(cropRect(200, 100, 2, 300, 50)).toEqual({ z: 2, side: 50, x: 175, y: 50 });
    });

    test("only the account's avatars and name change, and come back", () => {
        page();
        paintIdentity(document, identity);
        const [header, mine, other] = document.querySelectorAll<HTMLImageElement>("img.avatar");
        expect(header.getAttribute("src")).toBe(identity.avatar);
        expect(header.hasAttribute("srcset")).toBe(false);
        expect(mine.getAttribute("src")).toBe(identity.avatar);
        expect(other.getAttribute("src")).toContain("/bob/");
        const names = document.querySelector(".names")!;
        expect(names.querySelector(".ldpp-identity-name a")?.textContent).toBe("爱丽丝");
        expect(names.querySelectorAll(".ldpp-identity-hidden").length).toBe(2);
        expect(document.querySelectorAll(".ldpp-identity-name").length).toBe(1);

        paintIdentity(document, identity);
        expect(document.querySelectorAll(".ldpp-identity-name").length).toBe(1);

        restoreIdentity(document);
        expect(header.getAttribute("src")).toContain("/Alice/48/");
        expect(header.getAttribute("srcset")).toContain("/96/");
        expect(document.querySelector(".ldpp-identity-name, .ldpp-identity-hidden")).toBeNull();
    });

    test("a new picture replaces the old one without losing the original", () => {
        page();
        paintIdentity(document, identity);
        paintIdentity(document, { ...identity, avatar: "data:image/png;base64,BBBB" });
        const header = document.querySelector<HTMLImageElement>(".d-header img")!;
        expect(header.getAttribute("src")).toBe("data:image/png;base64,BBBB");
        restoreIdentity(document);
        expect(header.getAttribute("src")).toContain("/Alice/48/");
    });

    test("with 「其他位置」 off only the header changes", () => {
        page();
        paintIdentity(document, { ...identity, everywhere: false });
        const [header, mine] = document.querySelectorAll<HTMLImageElement>("img.avatar");
        expect(header.getAttribute("src")).toBe(identity.avatar);
        expect(mine.getAttribute("src")).toContain("/alice/48/");
    });

    test("an element Discourse reuses for another user is left to it", () => {
        page();
        paintIdentity(document, identity);
        const mine = document.querySelectorAll<HTMLImageElement>("img.avatar")[1];
        mine.setAttribute("src", "https://linux.do/user_avatar/linux.do/carol/48/3_2.png");
        paintIdentity(document, identity);
        expect(mine.getAttribute("src")).toContain("/carol/");
        expect(mine.hasAttribute("data-ldpp-identity")).toBe(false);
    });
});
