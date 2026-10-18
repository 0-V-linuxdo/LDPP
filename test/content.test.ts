/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { formatPost } from "../src/api/TopicContent";
import { renderContent } from "../src/utils/markdown";
import { sanitizeHtml } from "../src/utils/sanitize";
import { DEFAULT_PROMPTS, normalizePrompts, renderModeOf, stripFences } from "../src/plugins/topicSummary/prompts";

describe("sanitizer", () => {
    test("removes scripts, handlers and javascript urls", () => {
        const out = sanitizeHtml("<p onclick=\"x()\">hi<script>alert(1)</script><img src=x onerror=alert(1)><a href=\"javascript:alert(1)\">a</a><a href=\"https://linux.do\">b</a></p>");
        expect(out).not.toContain("script");
        expect(out).not.toContain("onerror");
        expect(out).not.toContain("onclick");
        expect(out).not.toContain("javascript:");
        expect(out).toContain("href=\"https://linux.do\"");
        expect(out).toContain("rel=\"noopener noreferrer nofollow\"");
    });

    test("keeps safe styling only", () => {
        const out = sanitizeHtml("<span style=\"color: #e45735; position: fixed; background-image: url(x)\">x</span>");
        expect(out).toBe("<span style=\"color: #e45735\">x</span>");
    });

    test("markdown renders through the sanitizer", () => {
        const html = renderContent("### 标题\n\n- **加粗**\n\n<img src=x onerror=alert(1)>", "markdown");
        expect(html).toContain("<h3>");
        expect(html).toContain("<strong>加粗</strong>");
        expect(html).not.toContain("onerror");
    });
});

describe("topic content", () => {
    test("cooked html becomes readable text with image placeholders", () => {
        const images: Array<{ id: number }> = [];
        const text = formatPost({
            id: 1,
            post_number: 3,
            username: "alice",
            reply_to_user: { username: "bob" },
            cooked: "<p>你好 <img class=\"emoji\" alt=\":smile:\" src=\"/images/emoji/smile.png\"></p><p><a href=\"https://example.com/x\">链接</a></p><div class=\"lightbox-wrapper\"><a class=\"lightbox\" href=\"https://linux.do/uploads/a.png\"><img src=\"https://linux.do/uploads/a_small.png\" alt=\"截图\"></a><div class=\"meta\">a.png 1920×1080</div></div><ul><li>一</li><li>二</li></ul>",
        }, images as never);
        expect(text.startsWith("#3 alice 回复 bob：")).toBe(true);
        expect(text).toContain("你好 :smile:");
        expect(text).toContain("链接 (https://example.com/x)");
        expect(text).toContain("[图片#1 截图]");
        expect(text).not.toContain("1920×1080");
        expect(text).toContain("- 一");
        expect(images).toHaveLength(1);
        expect((images[0] as unknown as { url: string }).url).toBe("https://linux.do/uploads/a.png");
    });
});

describe("prompts", () => {
    test("fallback to defaults and accept legacy field names", () => {
        expect(normalizePrompts([])).toEqual(DEFAULT_PROMPTS);
        const [prompt] = normalizePrompts([{ name: "旧", summaryMethod: "方法", outputFormat: "HTML 输出" }]);
        expect(prompt.system).toBe("方法");
        expect(renderModeOf(prompt, "x")).toBe("html");
    });

    test("strips configured fences only at the edges", () => {
        expect(stripFences("```html\n<p>a ``` b</p>\n```", ["```html"], ["```"])).toBe("<p>a ``` b</p>");
    });
});
