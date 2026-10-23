/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { type AIProfile, type ChatMessage, chatWithRetry, describeError, getProfile, requireProfile, userContent } from "@api/AI";
import { addQuestion, Questions } from "@api/DataStore";
import { subscribe } from "@api/Events";
import { prepareImages } from "@api/Images";
import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { buildTopicContent, type TopicContent } from "@api/TopicContent";
import { focusTopic } from "@api/TopicList";
import { autoGrow, Button, copyWithFeedback, IconButton, InfoTip, TextInput } from "@components/controls";
import { ArrowUpIcon, CopyIcon, PlusIcon, QuestionIcon, StopIcon, TrashIcon } from "@components/icons";
import { h, trackScrollbar } from "@utils/dom";
import { asString, isObject } from "@utils/guards";
import { Logger } from "@utils/Logger";
import { renderMarkdown } from "@utils/markdown";
import { errorMessage, isAbortError, randomId } from "@utils/misc";
import { formatTime } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";

export interface QAPreset {
    id: string;
    name: string;
    prompt: string;
}

const logger = new Logger("TopicQA", "#cba6f7");
const CONTENT_TTL_MS = 5 * 60_000;

export const BUILTIN_PRESETS: readonly QAPreset[] = [
    { id: "builtin-resolved", name: "是否解决", prompt: "这个话题里的主要问题或诉求解决了吗？请给出结论、关键依据和仍需确认的点。" },
    { id: "builtin-best", name: "最佳方案", prompt: "请从话题和回复中提炼目前最佳的方案：推荐做法、操作步骤、适用条件，以及风险或替代方案。" },
];

function normalizePresets(raw: unknown): QAPreset[] {
    if (!Array.isArray(raw)) return [];
    return raw.filter(isObject).map((item, index) => ({
        id: asString(item.id) || `custom-${index + 1}`,
        name: asString(item.name) || `自定义预设 ${index + 1}`,
        prompt: asString(item.prompt),
    })).filter(item => item.prompt);
}

function renderPresetEditor(): HTMLElement {
    const root = h("div", { class: "ldpp-preset-editor" });
    const render = () => {
        const presets = normalizePresets(settings.store.presets);
        const save = (next: QAPreset[]) => { settings.store.presets = next; };
        root.replaceChildren(
            ...presets.map((preset, index) => h("div", { class: "ldpp-preset-row" },
                TextInput({ value: preset.name, placeholder: "名称", onChange: value => save(presets.map((item, i) => i === index ? { ...item, name: value.trim() || item.name } : item)) }),
                TextInput({ value: preset.prompt, multiline: true, rows: 2, placeholder: "预设问题", onChange: value => save(presets.map((item, i) => i === index ? { ...item, prompt: value.trim() } : item).filter(item => item.prompt)) }),
                IconButton(TrashIcon(), { title: "删除", onClick: () => { save(presets.filter((_, i) => i !== index)); render(); } }),
            )),
            h("div", { class: "ldpp-row-actions" },
                Button("添加预设", { icon: PlusIcon(), small: true, onClick: () => { save([...presets, { id: randomId("preset-"), name: "新预设", prompt: "请基于这个话题回答：" }]); render(); } }),
                InfoTip(`内置预设：${BUILTIN_PRESETS.map(preset => preset.name).join("、")}。下面可添加自己的预设；在提问框为空时输入 / 也能快速选择。`),
            ),
        );
    };
    render();
    return root;
}

export const settings = definePluginSettings({
    presets: {
        type: OptionType.CUSTOM,
        default: [] as QAPreset[],
    },
    presetEditor: {
        type: OptionType.COMPONENT,
        description: "提问预设",
        render: renderPresetEditor,
    },
    historyTurns: {
        type: OptionType.SLIDER,
        description: "追问时带上最近几轮问答作为上下文。",
        min: 0,
        max: 20,
        default: 8,
    },
});

export function allPresets(): QAPreset[] {
    return [...BUILTIN_PRESETS, ...normalizePresets(settings.store.presets)];
}

type QuestionSource = (topicId: string) => Promise<void>;

const contentCache = new Map<string, { content: TopicContent; at: number }>();
const running = new Map<string, AbortController>();
/** The question being answered per topic, shown in the thread until its answer arrives. */
const pending = new Map<string, { question: string; presetName: string }>();
const stateListeners = new Set<(topicId: string) => void>();
const questionSources = new Set<QuestionSource>();

export function registerQuestionSource(source: QuestionSource): () => void {
    questionSources.add(source);
    return () => questionSources.delete(source);
}

function notify(topicId: string) {
    for (const listener of Array.from(stateListeners)) listener(topicId);
}

async function topicContent(topicId: string, profile: AIProfile, signal: AbortSignal): Promise<TopicContent> {
    const cached = contentCache.get(topicId);
    if (cached && Date.now() - cached.at < CONTENT_TTL_MS) return cached.content;
    const content = await buildTopicContent(topicId, { signal, retries: profile.retryCount });
    contentCache.set(topicId, { content, at: Date.now() });
    return content;
}

export function buildQuestionMessages(content: TopicContent, question: string, history: Array<{ question: string; answer: string }>, imageCount: number): ChatMessage[] {
    const past = history.map((item, i) => `追问 ${i + 1}\n问：${item.question}\n答：${item.answer}`).join("\n\n");
    const text = [
        `话题标题：${content.title}`,
        imageCount ? `本次附带 ${imageCount} 张话题图片，正文中的 [图片#N] 与之按编号对应。` : "",
        past ? `已有问答：\n${past}` : "已有问答：无",
        `用户问题：${question}`,
        `话题原文：\n${content.text}`,
    ].filter(Boolean).join("\n\n");
    return [
        { role: "system", content: "你是严谨的技术话题阅读助手。只根据提供的话题原文和已有问答作答，不要编造原文没有的信息；证据不足时明确说明还需要确认什么。使用简体中文和 Markdown。" },
        { role: "user", content: text },
    ];
}

export async function askTopic(topicId: string, question: string, preset?: QAPreset): Promise<boolean> {
    if (running.has(topicId)) return false;
    const controller = new AbortController();
    running.set(topicId, controller);
    pending.set(topicId, { question, presetName: preset?.name ?? "" });
    notify(topicId);
    try {
        const profile = requireProfile(getProfile());
        const content = await topicContent(topicId, profile, controller.signal);
        const images = profile.imageInput && content.images.length ? (await prepareImages(content.images, profile, controller.signal)).prepared : [];
        const turns = settings.store.historyTurns;
        const history = turns > 0 ? (Questions.get(topicId) ?? []).slice(0, turns).toReversed() : [];
        const messages = buildQuestionMessages(content, question, history, images.length);
        messages[1].content = userContent(messages[1].content as string, images);
        const answer = await chatWithRetry(profile, messages, {
            signal: controller.signal,
            onRetry: notice => showToast(`提问失败，第 ${notice.attempt}/${notice.total} 次重试…`, "warning", { topicId, key: `qa:${topicId}`, onClick: type => focusTopic(topicId, "question", type) }),
        });
        addQuestion(topicId, { id: randomId("qa-"), question, answer, presetId: preset?.id ?? "", presetName: preset?.name ?? "", timestamp: new Date().toISOString(), model: profile.model || "未知模型" });
        return true;
    } catch (error) {
        if (isAbortError(error)) return false;
        logger.error("提问失败", error);
        showToast(`提问失败：${errorMessage(error)}`, "error", { topicId, key: `qa:${topicId}`, onClick: type => focusTopic(topicId, "question", type) });
        throw error;
    } finally {
        running.delete(topicId);
        pending.delete(topicId);
        notify(topicId);
    }
}

export interface QAPanel {
    readonly el: HTMLElement;
    focus(): void;
    destroy(): void;
}

export interface QAPanelOptions {
    /** In the sidebar the thread scrolls and the composer stays at the bottom; in a list row both flow. */
    variant?: "sidebar" | "list";
}

/** One exchange: the question (with its preset's name), then whatever follows it - the answer, a spinner or an error. */
function turn(question: string, presetName: string, ...rest: HTMLElement[]): HTMLElement {
    return h("article", { class: "ldpp-qa-turn" },
        h("div", { class: "ldpp-qa-q" }, presetName ? h("span", { class: "ldpp-qa-tag" }, presetName) : null, question),
        ...rest,
    );
}

/*
 * A chat thread: earlier questions and answers in order, oldest first, so the latest sits right above the composer;
 * the composer (preset chips, then the question box with its send / stop button) stays at the bottom. No heading of
 * its own: the sidebar tab and the list panel already say 「提问」.
 */
export function createQAPanel(topicId: string, { variant = "sidebar" }: QAPanelOptions = {}): QAPanel {
    let failed: { question: string; preset?: QAPreset; error: unknown } | null = null;
    let chosen: QAPreset | undefined;
    const thread = trackScrollbar(h("div", { class: "ldpp-qa-thread" }));
    const input = autoGrow(h("textarea", {
        class: "ldpp-qa-input",
        rows: 1,
        placeholder: "输入问题…",
        title: "Ctrl/⌘ + Enter 发送；输入框为空时按 / 选择预设",
        attrs: { "aria-label": "问题" },
    }), () => Math.round(window.innerHeight * 0.3));
    const menu = h("div", { class: "ldpp-qa-menu", hidden: true, attrs: { role: "menu" } });
    const chips = h("div", { class: "ldpp-qa-chips", attrs: { "aria-label": "提问预设" } });
    const sendButton = IconButton(ArrowUpIcon(16), { title: "发送（Ctrl/⌘ + Enter）", className: "ldpp-qa-send" });
    const box = h("div", { class: "ldpp-qa-box" }, menu, input, sendButton);
    const el = h("div", { class: `ldpp-qa ldpp-qa-${variant}` }, thread, h("div", { class: "ldpp-qa-composer" }, chips, box));

    const busy = () => running.has(topicId);
    const fill = (preset: QAPreset) => {
        chosen = preset;
        input.value = preset.prompt;
        input.dispatchEvent(new Event("input"));
        menu.hidden = true;
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    };
    const renderPresets = () => {
        const list = allPresets();
        chips.replaceChildren(...list.map(preset => h("button", { type: "button", class: "ldpp-qa-chip", title: preset.prompt, on: { click: () => fill(preset) } }, preset.name)));
        menu.replaceChildren(...list.map(preset => h("button", { type: "button", class: "ldpp-qa-menu-item", attrs: { role: "menuitem" }, on: { click: () => fill(preset) } }, preset.name)));
    };
    const renderThread = () => {
        const records = (Questions.get(topicId) ?? []).toReversed();
        const asking = pending.get(topicId);
        const items: HTMLElement[] = records.map(record => turn(record.question, record.presetName,
            h("div", { class: "ldpp-content ldpp-qa-a", innerHTML: renderMarkdown(record.answer) }),
            h("div", { class: "ldpp-qa-meta" },
                h("span", null, `🕒 ${formatTime(record.timestamp)} · 🤖 ${record.model}`),
                IconButton(CopyIcon(14), { title: "复制回答", onClick: event => void copyWithFeedback(event.currentTarget as HTMLElement, record.answer) }),
            ),
        ));
        if (asking) {
            items.push(turn(asking.question, asking.presetName, h("div", { class: "ldpp-qa-pending" }, h("span", { class: "ldpp-spinner" }), "AI 正在回答…")));
        } else if (failed) {
            const { question, preset, error } = failed;
            const details = describeError(error);
            items.push(turn(question, preset?.name ?? "", h("div", { class: "ldpp-error-box ldpp-qa-error" },
                h("strong", null, `提问失败：${errorMessage(error)}`),
                h("details", null, h("summary", null, "完整报错"), h("pre", { class: "ldpp-pre" }, details)),
                h("div", { class: "ldpp-row-actions" },
                    Button("重试", { small: true, kind: "primary", onClick: () => void submit(question, preset) }),
                    Button("复制报错", { small: true, onClick: event => void copyWithFeedback(event.currentTarget as HTMLElement, details) }),
                ),
            )));
        }
        if (!items.length) items.push(h("p", { class: "ldpp-qa-empty" }, "向 AI 提问这个话题，回答只依据话题内容。"));
        thread.replaceChildren(...items);
        // Our own changes only (a new question, an answer, an error): the latest turn is what the user wants to see.
        requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
    };
    const renderControls = () => {
        const answering = busy();
        sendButton.replaceChildren(answering ? StopIcon(14) : ArrowUpIcon(16));
        sendButton.classList.toggle("is-stop", answering);
        sendButton.title = answering ? "停止回答" : "发送（Ctrl/⌘ + Enter）";
        sendButton.setAttribute("aria-label", sendButton.title);
        sendButton.disabled = !answering && !input.value.trim();
    };
    const submit = async (question = input.value.trim(), preset = chosen?.prompt === question ? chosen : undefined) => {
        if (!question || busy()) return;
        failed = null;
        const typed = question === input.value.trim();
        if (typed) {
            input.value = "";
            input.dispatchEvent(new Event("input"));
            chosen = undefined;
        }
        try {
            await askTopic(topicId, question, preset);
        } catch (error) {
            failed = { question, preset, error };
        }
        renderThread();
        renderControls();
        if (!busy()) input.focus();
    };
    sendButton.addEventListener("click", () => {
        if (busy()) running.get(topicId)?.abort();
        else void submit();
    });
    input.addEventListener("keydown", event => {
        if (event.isComposing) return;
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            void submit();
        } else if (event.key === "/" && !input.value.trim()) {
            event.preventDefault();
            menu.hidden = false;
        } else if (event.key === "Escape" && !menu.hidden) {
            event.stopPropagation();
            menu.hidden = true;
        }
    });
    input.addEventListener("input", () => {
        if (input.value.trim()) menu.hidden = true;
        renderControls();
    });

    renderPresets();
    renderThread();
    renderControls();
    const onState = (id: string) => {
        if (id !== topicId) return;
        renderThread();
        renderControls();
    };
    stateListeners.add(onState);
    const unsubs = [
        () => stateListeners.delete(onState),
        subscribe("dataChange", ({ store, ids }) => { if (store === "questions" && ids.includes(topicId)) renderThread(); }),
    ];
    for (const source of questionSources) source(topicId).catch(error => logger.warn("拉取问答历史失败", error));
    return {
        el,
        focus: () => requestAnimationFrame(() => input.focus()),
        destroy: () => { for (const unsub of unsubs.splice(0)) unsub(); },
    };
}

export default definePlugin({
    name: "TopicQA",
    displayName: "提问 / 追问",
    description: "针对当前话题向 AI 提问并保存问答记录；支持内置与自定义提问预设，在侧栏和列表总结面板中都可使用。",
    tags: ["ai", "reading"],
    icon: QuestionIcon,
    enabledByDefault: true,
    settings,
});

