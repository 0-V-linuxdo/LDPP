/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";

import { configureAI, normalizeProfile } from "../src/api/AI";
import { DeArrowStates } from "../src/api/DataStore";
import { registerPlugin, setPluginEnabled } from "../src/api/PluginManager";
import { mergeDeArrowState, normalizeDeArrow } from "../src/api/records";
import { displayedTitle, flushNow, getRows, setTitleOverride, setTitlePreview } from "../src/api/TopicList";
import DeArrow, { settings } from "../src/plugins/deArrow";
import { acceptFixes, buildFixMessages, changedPart, DEFAULT_FIX_PROMPT, fixMark, parseFixes } from "../src/plugins/deArrow/typos";
import { applyEdits } from "../src/utils/text";

const row = (id: string, titleHtml: string) => `<tr class="topic-list-item" data-topic-id="${id}"><td class="main-link"><span class="link-top-line"><a class="title raw-link raw-topic-link" href="/t/topic/${id}"><span dir="auto">${titleHtml}</span></a></span><div class="link-bottom-line"></div></td></tr>`;
const mount = (...rows: string[]) => { document.body.innerHTML = `<div id="main-outlet"><table><tbody>${rows.join("")}</tbody></table></div>`; };
const holder = (id: string) => document.querySelector<HTMLElement>(`tr[data-topic-id="${id}"] a.title span[dir]`)!;

describe("错别字 fixes are checked before they are shown", () => {
    test("accepts real typos, quoted exactly, in title order", () => {
        expect(acceptFixes("求助：Calude 按装后我以经无法登录", [{ from: "我以经", to: "我已经" }, { from: "Calude", to: "Claude" }, { from: "按装", to: "安装" }]))
            .toEqual([{ from: "Calude", to: "Claude" }, { from: "按装", to: "安装" }, { from: "我以经", to: "我已经" }]);
        expect(acceptFixes("求助我的的电脑开不了机", [{ wrong: "我的的", right: "我的" }])).toEqual([{ from: "我的的", to: "我的" }]);
    });

    test("drops anything that is not a typo fix: rewording, formatting, guesses about fragments", () => {
        const title = "github 上的项目,在在哪里下载 震惊";
        expect(acceptFixes(title, [{ from: "github", to: "GitHub" }])).toEqual([]);
        expect(acceptFixes(title, [{ from: "项目,", to: "项目，" }])).toEqual([]);
        expect(acceptFixes(title, [{ from: "在", to: "再" }])).toEqual([]);
        expect(acceptFixes(title, [{ from: "不存在", to: "不再在" }])).toEqual([]);
        expect(acceptFixes(title, [{ from: "哪里下载 震惊", to: "哪里可以免费下载到" }])).toEqual([]);
        expect(acceptFixes(title, [{ from: "上的", to: "上地" }, { from: "上的项", to: "上地项" }])).toEqual([{ from: "上的", to: "上地" }]);
        const many = Array.from({ length: 5 }, (_, i) => ({ from: `x${i}`, to: `y${i}` }));
        expect(acceptFixes("x0 x1 x2 x3 x4", many)).toEqual([]);
        expect(acceptFixes(title, "nope")).toEqual([]);
    });

    test("marks only the changed characters, or the whole fragment for a deletion", () => {
        expect(changedPart("我以经", "我已经")).toMatchObject({ removed: "以", inserted: "已", start: 1, end: 2 });
        expect(fixMark({ from: "Calude", to: "Claude" })).toEqual([1, 3]);
        expect(fixMark({ from: "我的的", to: "我的" })).toEqual([0, 2]);
    });

    test("asks 20 titles at a time and reads only the topics with typos", () => {
        const topics = Array.from({ length: 25 }, (_, i) => ({ topicId: String(i), title: `t${i}` }));
        const messages = buildFixMessages("", topics);
        expect(messages[0].content).toBe(DEFAULT_FIX_PROMPT);
        expect(JSON.parse(messages[1].content as string)).toHaveLength(20);
        const found = parseFixes("```json\n{\"results\":[{\"topic_id\":7,\"fixes\":[{\"from\":\"以经\",\"to\":\"已经\"}]},{\"topicId\":\"8\"}]}\n```");
        expect([...found.keys()]).toEqual(["7"]);
        expect(parseFixes("{\"results\":[]}").size).toBe(0);
        expect(() => parseFixes("没有错别字")).toThrow();
    });

    test("applies edits by first occurrence and reports where each landed", () => {
        expect(applyEdits("我以经按装好了", [{ from: "按装", to: "安装" }, { from: "以经", to: "已经" }])).toEqual({ text: "我已经安装好了", placed: [{ edit: 1, start: 1 }, { edit: 0, start: 3 }] });
    });

    test("stored, synced and imported like the other DeArrow results", () => {
        const base = { originalTitle: "我以经装好了" };
        const old = normalizeDeArrow({ ...base, verdict: false, verdictUpdatedAt: "2026-01-01T00:00:00Z", fixes: [{ from: "以经", to: "已经" }, { from: "x", to: "x" }], fixModel: "m", fixCheckedAt: "2026-01-01T00:00:00Z" })!;
        expect(old.fixes).toEqual([{ from: "以经", to: "已经" }]);
        const fresh = normalizeDeArrow({ ...base, fixModel: "m2", fixCheckedAt: "2026-02-01T00:00:00Z" })!;
        expect(fresh.fixes).toBeUndefined();
        const merged = mergeDeArrowState(old, fresh)!;
        expect(merged).toMatchObject({ verdict: false, fixModel: "m2", fixCheckedAt: "2026-02-01T00:00:00.000Z" });
        expect(merged.fixes).toBeUndefined();
        expect(normalizeDeArrow({ ...base, fixes: [{ from: "以经", to: "已经" }] })?.fixes).toBeUndefined();
    });
});

describe("corrected titles in the list", () => {
    afterEach(() => {
        setTitleOverride("1", null);
        document.body.innerHTML = "";
    });

    test("only the fragment changes: emoji stay in place, the original comes back on preview", () => {
        mount(row("1", `我以经 <img class="emoji" alt=":rocket:"> 按装好了`));
        flushNow();
        setTitleOverride("1", { edits: [{ from: "以经", to: "已经", mark: [0, 1] }, { from: "按装", to: "安装", mark: [0, 1] }], highlight: "test-fix" });
        expect(holder("1").innerHTML).toBe(`我已经 <img class="emoji" alt=":rocket:"> 安装好了`);
        expect(holder("1").className).toBe("ldpp-title-overridden ldpp-title-edited");
        flushNow();
        const current = getRows()[0];
        expect(current.originalTitle).toBe("我以经 按装好了");
        expect(displayedTitle(current)).toBe("我已经 安装好了");
        setTitlePreview("1", true);
        expect(holder("1").textContent).toBe("我以经  按装好了");
        expect(holder("1").classList.contains("ldpp-title-edited")).toBe(false);
        setTitlePreview("1", false);
        expect(holder("1").textContent).toBe("我已经  安装好了");
    });

    test("a real title change from the site drops the fixes", () => {
        mount(row("1", "我以经装好了"));
        flushNow();
        setTitleOverride("1", { edits: [{ from: "以经", to: "已经" }], highlight: "test-fix" });
        holder("1").firstChild!.nodeValue = "站点改过的标题";
        flushNow();
        expect(getRows()[0].originalTitle).toBe("站点改过的标题");
        expect(holder("1").classList.contains("ldpp-title-edited")).toBe(false);
    });
});

describe("DeArrow 修正错别字", () => {
    const realFetch = globalThis.fetch;
    const requests: string[] = [];

    beforeAll(() => {
        registerPlugin(DeArrow);
        configureAI({ list: () => [normalizeProfile({ id: "p", name: "测试", url: "https://ai.test/v1/chat/completions", key: "k", model: "cheap", retryCount: 0 })], activeId: () => "p" });
        globalThis.fetch = (async (_url: string, init: RequestInit) => {
            const body = JSON.parse(String(init.body)) as { messages: Array<{ content: string }> };
            const system = body.messages[0].content;
            const topics = JSON.parse(body.messages[1].content) as Array<{ topicId: string }>;
            requests.push(system === DEFAULT_FIX_PROMPT ? "fix" : "judge");
            const content = system === DEFAULT_FIX_PROMPT
                ? { results: [{ topicId: "7", fixes: [{ from: "我以经", to: "我已经" }, { from: "Docker", to: "docker" }] }, { topicId: "8", fixes: [{ from: "部署", to: "如何部署到服务器" }] }] }
                : { results: topics.map(topic => ({ topicId: topic.topicId, verdict: false, reason: "普通求助" })) };
            return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), { status: 200 });
        }) as typeof fetch;
    });

    afterAll(() => {
        setPluginEnabled("DeArrow", false);
        settings.reset("scope");
        globalThis.fetch = realFetch;
        DeArrowStates.replaceAll({}, "local");
        document.body.innerHTML = "";
    });

    test("checks the titles in scope once, shows the accepted fixes and keeps the original for the blocker", async () => {
        settings.store.scope = "https://linux.do/latest";
        mount(row("7", "Docker 我以经装好了"), row("8", "Docker 部署求助"));
        setPluginEnabled("DeArrow", true);
        flushNow();
        for (let i = 0; i < 50 && !(DeArrowStates.get("7")?.fixCheckedAt && DeArrowStates.get("8")?.fixCheckedAt); i++) await new Promise(resolve => setTimeout(resolve, 20));
        flushNow();
        expect(DeArrowStates.get("7")?.fixes).toEqual([{ from: "我以经", to: "我已经" }]);
        expect(DeArrowStates.get("8")?.fixes).toBeUndefined();
        expect(holder("7").textContent).toBe("Docker 我已经装好了");
        expect(holder("8").textContent).toBe("Docker 部署求助");
        expect(getRows().find(r => r.id === "7")?.originalTitle).toBe("Docker 我以经装好了");
        const button = document.querySelector<HTMLButtonElement>('tr[data-topic-id="7"] .ldpp-dearrow-btn')!;
        expect(button.title).toContain("已修正错别字：我以经→我已经");
        button.dispatchEvent(new MouseEvent("mouseenter"));
        expect(holder("7").textContent).toBe("Docker 我以经装好了");
        button.dispatchEvent(new MouseEvent("mouseleave"));
        expect(requests.filter(kind => kind === "fix")).toHaveLength(1);

        settings.store.fixTypos = false;
        flushNow();
        expect(holder("7").textContent).toBe("Docker 我以经装好了");
        settings.store.fixTypos = true;
        flushNow();
        expect(holder("7").textContent).toBe("Docker 我已经装好了");
        expect(requests.filter(kind => kind === "fix")).toHaveLength(1);
    });
});
