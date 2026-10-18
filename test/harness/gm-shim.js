/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

(() => {
    const PREFIX = "ldpp-harness:";
    const listeners = new Map();
    const mock = window.__ldppMock = window.__ldppMock || { calls: [], failNext: 0, delay: 400 };

    window.GM_getValue = (key, fallback) => {
        const raw = localStorage.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
    };
    window.GM_setValue = (key, value) => localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.GM_deleteValue = key => localStorage.removeItem(PREFIX + key);
    window.GM_addValueChangeListener = (key, fn) => {
        listeners.set(key, fn);
        return listeners.size;
    };
    window.GM_registerMenuCommand = (name, fn) => {
        (window.__ldppMenu = window.__ldppMenu || {})[name] = fn;
    };
    window.GM_setClipboard = text => navigator.clipboard.writeText(text);

    const textOf = content => typeof content === "string" ? content : (content || []).map(part => part.text || "").join("");

    function answer(messages) {
        const system = textOf(messages.find(m => m.role === "system")?.content);
        const user = textOf(messages.filter(m => m.role === "user").at(-1)?.content);
        const trimmed = user.trim();
        if (trimmed.startsWith("[")) {
            const topics = JSON.parse(trimmed);
            return JSON.stringify({
                results: topics.map(topic => {
                    const verdict = /[?？!！吗]|震惊|竟然|速看|绝了/.test(topic.title);
                    return { topicId: topic.topicId, verdict, reason: verdict ? "标题含疑问或感叹，信息不足" : "标题具体" };
                }),
            });
        }
        if (trimmed.startsWith("{")) {
            const payload = JSON.parse(trimmed);
            const body = String(payload.firstPost || "").replace(/^#\d+\s+\S+：\s*/, "").replace(/\s+/g, " ").trim();
            return "```json\n" + JSON.stringify({ title: `【改写】${body.slice(0, 24) || payload.originalTitle}` }) + "\n```";
        }
        if (user.includes("用户问题")) {
            const question = (user.match(/用户问题：([^\n]*)/) || [])[1] || "";
            return `**回答（mock）**\n\n你问的是：${question}\n\n- 依据：原文第 1 楼\n- 结论：需要更多信息`;
        }
        const title = (user.match(/话题标题：([^\n]*)/) || [])[1] || "未知话题";
        const isHtml = /HTML/i.test(system) && !/Markdown/i.test(system.split("输出格式")[1] || "");
        if (isHtml) return `<h3>内容概述</h3><p>${title}（mock 总结）</p><hr><h3>关键要点</h3><ol><li>要点一</li><li>要点二</li></ol>`;
        return `### 内容概述\n${title}（mock 总结）\n\n### 关键要点\n1. 要点一\n2. 要点二\n\n### 结论与共识\n- 暂无共识`;
    }

    window.GM_xmlhttpRequest = options => {
        const controller = new AbortController();
        const url = String(options.url);
        if (url.startsWith("https://mock.ldpp.test/")) {
            const body = JSON.parse(options.data || "{}");
            mock.calls.push({ url, body, at: Date.now() });
            const timer = setTimeout(() => {
                if (mock.failNext > 0) {
                    mock.failNext--;
                    options.onload?.({ status: 500, statusText: "mock failure", responseText: "{\"error\":\"mock\"}", response: null, responseHeaders: "content-type: application/json", finalUrl: url });
                    return;
                }
                const content = answer(body.messages || []);
                const responseText = JSON.stringify({ choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content } }] });
                options.onload?.({ status: 200, statusText: "OK", responseText, response: responseText, responseHeaders: "content-type: application/json", finalUrl: url });
            }, mock.delay);
            controller.signal.addEventListener("abort", () => {
                clearTimeout(timer);
                options.onabort?.();
            });
            return { abort: () => controller.abort() };
        }
        fetch(url, { method: options.method || "GET", headers: options.headers, body: options.data, credentials: options.anonymous ? "omit" : "include", signal: controller.signal })
            .then(async res => {
                const isBuffer = options.responseType === "arraybuffer";
                const response = isBuffer ? await res.arrayBuffer() : await res.text();
                options.onload?.({ status: res.status, statusText: res.statusText, responseText: isBuffer ? "" : response, response, responseHeaders: `content-type: ${res.headers.get("content-type") || ""}`, finalUrl: res.url });
            })
            .catch(error => error.name === "AbortError" ? options.onabort?.() : options.onerror?.(error));
        return { abort: () => controller.abort() };
    };
})();
