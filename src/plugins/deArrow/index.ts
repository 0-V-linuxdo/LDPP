/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { AIError, chatWithRetry, getProfile, requireProfile, userContent } from "@api/AI";
import { DeArrowStates } from "@api/DataStore";
import { subscribe } from "@api/Events";
import { prepareImages } from "@api/Images";
import { closeToast, showToast } from "@api/Notifications";
import { isPluginEnabled } from "@api/PluginManager";
import type { DeArrowState } from "@api/records";
import { definePluginSettings } from "@api/Settings";
import { buildTopicContent } from "@api/TopicContent";
import { flashRow, focusTopic, registerDecorator, registerProcessor, rowsForTopic, schedule, setTitleMark, setTitleOverride, setTitlePreview, type TopicRow, unregisterDecorator, unregisterProcessor } from "@api/TopicList";
import { DeArrowIcon } from "@components/icons";
import { classes } from "@utils/css";
import { h } from "@utils/dom";
import { Logger } from "@utils/Logger";
import { errorMessage } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

import { profileChoices } from "../_core/ai";
import { claim, heldElsewhere, release } from "./claims";
import { buildJudgeMessages, buildRewriteMessages, DEFAULT_JUDGE_PROMPT, DEFAULT_REWRITE_PROMPT, JUDGE_BATCH, type JudgeInput, parseJudge, parseRewrite } from "./protocol";
import { checkScope, compileScope, DEFAULT_SCOPE, scopeMatches } from "./scope";
import { acceptFixes, buildFixMessages, DEFAULT_FIX_PROMPT, describeFixes, FIX_BATCH, fixMark, parseFixes } from "./typos";

const logger = new Logger("DeArrow", "#f5c2e7");
const AUTO_CONCURRENCY = 2;
const DRAIN_DELAY_MS = 300;
const FIX_HIGHLIGHT = "ldpp-title-fix";

const profileOptions = () => [{ label: "跟随默认 AI 配置", value: "" }, ...profileChoices()];

export const settings = definePluginSettings({
    autoRewrite: {
        type: OptionType.BOOLEAN,
        description: "判定为标题党后自动读取首帖并改写标题（关闭时可点击 ✦ 按钮手动改写）。",
        default: false,
    },
    fixTypos: {
        type: OptionType.BOOLEAN,
        description: "修正错别字：在作用范围内用 AI 找出标题里写错的字并改正显示，改过的字带点状下划线；只改错字，不动措辞。",
        default: true,
    },
    judgeProfile: {
        type: OptionType.SELECT,
        description: "标题判断与错别字修正使用的 AI 配置（建议选便宜快速的模型）",
        options: profileOptions,
        default: "",
    },
    rewriteProfile: {
        type: OptionType.SELECT,
        description: "标题改写使用的 AI 配置",
        options: profileOptions,
        default: "",
    },
    scope: {
        type: OptionType.STRING,
        description: "自动判断与改写的作用范围（每行一个完整 URL，* 匹配任意字符，#hash 会被忽略）。范围外的列表仍显示按钮和已改写的标题，可手动改写。",
        group: "作用范围与提示词",
        tab: "作用范围",
        multiline: true,
        default: DEFAULT_SCOPE.join("\n"),
        isValid: value => {
            const result = checkScope(value);
            return result.errors.length ? result.errors.join("；") : true;
        },
    },
    judgePrompt: {
        type: OptionType.STRING,
        description: "标题判断提示词（需保留严格 JSON 返回格式）",
        group: "作用范围与提示词",
        tab: "判断提示词",
        multiline: true,
        default: DEFAULT_JUDGE_PROMPT,
    },
    rewritePrompt: {
        type: OptionType.STRING,
        description: "标题改写提示词（需保留严格 JSON 返回格式）",
        group: "作用范围与提示词",
        tab: "改写提示词",
        multiline: true,
        default: DEFAULT_REWRITE_PROMPT,
    },
    fixPrompt: {
        type: OptionType.STRING,
        description: "错别字修正提示词（需保留严格 JSON 返回格式）",
        group: "作用范围与提示词",
        tab: "错别字提示词",
        multiline: true,
        default: DEFAULT_FIX_PROMPT,
    },
});

interface RuntimeError {
    kind: "judge" | "rewrite";
    message: string;
    title: string;
}

const overridden = new Set<string>();
const marked = new Set<string>();
const judgeQueue = new Map<string, JudgeInput>();
const judging = new Set<string>();
/** The judge request in flight for each topic, so a rewrite waits for it instead of sending another. */
const judgeRuns = new Map<string, Promise<unknown>>();
const rewriting = new Map<string, string>();
const errors = new Map<string, RuntimeError>();
const autoQueue: JudgeInput[] = [];
const fixQueue = new Map<string, JudgeInput>();
const fixing = new Set<string>();
/** Titles whose typo check failed this session; they are not sent again until the page reloads. */
const fixFailed = new Map<string, string>();
const unsubs: Array<() => void> = [];
let scopeRegex: RegExp[] | null = null;
let autoActive = 0;
let drainTimer: ReturnType<typeof setTimeout> | null = null;
let draining = false;
let fixTimer: ReturnType<typeof setTimeout> | null = null;
let fixDraining = false;

function inScope(): boolean {
    scopeRegex ??= compileScope(checkScope(settings.store.scope).rules);
    return scopeMatches(scopeRegex, location.href);
}


function stateFor(topicId: string, title: string): DeArrowState | undefined {
    const state = DeArrowStates.get(topicId);
    return state?.originalTitle === title ? state : undefined;
}

function baseState(topicId: string, title: string): DeArrowState {
    return stateFor(topicId, title) ?? { originalTitle: title, updatedAt: "" };
}

/** The typo fixes the list shows for a topic: none once it has a rewritten title, or with the option off. */
function shownFixes(state: DeArrowState | undefined) {
    return settings.store.fixTypos && state && !state.rewrittenTitle ? state.fixes ?? [] : [];
}

function errorFor(topicId: string, title: string): RuntimeError | undefined {
    const error = errors.get(topicId);
    return error?.title === title ? error : undefined;
}

function buttonView(row: TopicRow): { state: string; title: string; busy: boolean; preview: boolean } {
    const state = stateFor(row.id, row.originalTitle);
    const phase = rewriting.get(row.id);
    const error = errorFor(row.id, row.originalTitle);
    if (phase) return { state: "working", title: phase, busy: true, preview: false };
    const fixes = shownFixes(state);
    // Hovering ✦ shows the original title whenever the list shows another one (rewritten, or with typos fixed).
    const preview = Boolean(state?.rewrittenTitle) || fixes.length > 0;
    const note = fixes.length ? `\n已修正错别字：${describeFixes(fixes)}（悬停时显示原标题）` : "";
    if (judging.has(row.id) || judgeQueue.has(row.id)) return { state: "judging", title: `正在判断是否为标题党…${note}`, busy: false, preview };
    if (error) return { state: "error", title: `DeArrow ${error.kind === "judge" ? "判断" : "改写"}失败：${error.message}（点击重试）${note}`, busy: false, preview };
    if (state?.rewrittenTitle) return { state: "rewritten", title: `已改写。悬停查看原标题：${row.originalTitle}\n点击重新改写`, busy: false, preview };
    if (state?.verdict === true) return { state: "clickbait", title: `疑似标题党：${state.verdictReason || "无理由"}（点击改写）${note}`, busy: false, preview };
    if (state?.verdict === false) return { state: "neutral", title: `${state.verdictReason || "未发现标题党特征"}（仍可点击改写）${note}`, busy: false, preview };
    return { state: "unjudged", title: `尚未判断（点击判断并改写）${note}`, busy: false, preview };
}

function renderButton(row: TopicRow, slot: HTMLElement) {
    const view = buttonView(row);
    const existing = slot.firstElementChild as HTMLButtonElement | null;
    const signature = `${view.state}|${view.title}`;
    if (existing?.dataset.signature === signature) return;
    const button = h("button", {
        type: "button",
        class: classes("ldpp-row-btn ldpp-dearrow-btn", `is-${view.state}`),
        title: view.title,
        disabled: view.busy,
        dataset: { signature },
        attrs: { "aria-label": view.title },
        on: {
            click: (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                setTitlePreview(row.id, false);
                onButtonClick(row);
            },
            mouseenter: () => { if (view.preview) setTitlePreview(row.id, true); },
            mouseleave: () => setTitlePreview(row.id, false),
            focus: () => { if (view.preview) setTitlePreview(row.id, true); },
            blur: () => setTitlePreview(row.id, false),
        },
    }, DeArrowIcon(18));
    slot.replaceChildren(button);
}

function refreshButtons(topicId: string) {
    for (const row of rowsForTopic(topicId)) {
        const slot = row.el.querySelector<HTMLElement>(".ldpp-actions > [data-slot='dearrow']");
        if (slot) renderButton(row, slot);
    }
}

function onButtonClick(row: TopicRow) {
    const error = errorFor(row.id, row.originalTitle);
    errors.delete(row.id);
    if (error?.kind === "judge" && !stateFor(row.id, row.originalTitle)?.rewrittenTitle) {
        judgeQueue.set(row.id, { topicId: row.id, title: row.originalTitle });
        refreshButtons(row.id);
        scheduleDrain();
        return;
    }
    void rewrite({ topicId: row.id, title: row.originalTitle }, false);
}

// A batch toast is shared by every batch that fails, so a click goes to whichever batch failed last.
const batchFailures = new Map<string, JudgeInput[]>();

function batchToast(key: string, what: string, batch: JudgeInput[], error: unknown) {
    batchFailures.set(key, batch);
    const message = `DeArrow ${what}${batch.length > 1 ? `（${batch.length} 个话题）` : ""}：${errorMessage(error)}`;
    showToast(message, "error", {
        topicId: batch.length === 1 ? batch[0].topicId : undefined,
        key,
        onClick: () => {
            locateBatch(batchFailures.get(key) ?? []);
            batchFailures.delete(key);
        },
        onDismiss: () => batchFailures.delete(key),
    });
}

function locateBatch(batch: JudgeInput[]) {
    const rows = batch.flatMap(item => rowsForTopic(item.topicId).filter(row => !row.hidden));
    if (!rows.length) {
        if (batch.length) focusTopic(batch[0].topicId, "locate");
        return;
    }
    rows[0].el.scrollIntoView({ block: "center", behavior: "smooth" });
    for (const row of rows) flashRow(row);
}

function scheduleDrain() {
    if (drainTimer) return;
    drainTimer = setTimeout(() => {
        drainTimer = null;
        void drainJudge();
    }, DRAIN_DELAY_MS);
}

async function judgeBatch(batch: JudgeInput[]) {
    const profile = getProfile(String(settings.store.judgeProfile ?? "") || undefined);
    const text = await chatWithRetry(profile, buildJudgeMessages(settings.store.judgePrompt, batch));
    const results = new Map(parseJudge(text).map(result => [result.topicId, result]));
    const now = new Date().toISOString();
    const updates: Record<string, DeArrowState> = {};
    for (const input of batch) {
        const result = results.get(input.topicId);
        if (!result) {
            errors.set(input.topicId, { kind: "judge", message: "模型没有返回这个话题的判断", title: input.title });
            continue;
        }
        const current = DeArrowStates.get(input.topicId);
        if (current && current.originalTitle !== input.title) continue;
        updates[input.topicId] = { ...baseState(input.topicId, input.title), verdict: result.verdict, verdictReason: result.reason, verdictModel: profile?.model ?? "", verdictUpdatedAt: now, updatedAt: now };
    }
    DeArrowStates.setMany(updates);
}

async function drainJudge() {
    if (draining) return;
    draining = true;
    try {
        while (judgeQueue.size && isPluginEnabled("DeArrow")) {
            const picked = Array.from(judgeQueue.values()).slice(0, JUDGE_BATCH);
            for (const item of picked) {
                judgeQueue.delete(item.topicId);
                judging.add(item.topicId);
                refreshButtons(item.topicId);
            }
            const claimed = await Promise.all(picked.map(item => claim("judge", item.topicId)));
            const batch = picked.filter((_, index) => claimed[index]);
            for (const item of picked) {
                if (batch.includes(item)) continue;
                judging.delete(item.topicId);
                refreshButtons(item.topicId);
            }
            if (!batch.length) continue;
            const run = judgeBatch(batch);
            for (const item of batch) judgeRuns.set(item.topicId, run);
            try {
                await run;
                closeToast("dearrow-judge");
            } catch (error) {
                logger.warn("判断失败", error);
                for (const item of batch) errors.set(item.topicId, { kind: "judge", message: errorMessage(error), title: item.title });
                if (!(error instanceof AIError && (error.code === "NO_KEY" || error.code === "NO_PROFILE"))) batchToast("dearrow-judge", "判断失败", batch, error);
            } finally {
                // Store the results before letting go, or another tab could pick the topics up again in between.
                DeArrowStates.flush();
                for (const item of batch) {
                    judging.delete(item.topicId);
                    judgeRuns.delete(item.topicId);
                    release("judge", item.topicId);
                    refreshButtons(item.topicId);
                }
            }
        }
    } finally {
        draining = false;
        schedule();
    }
}

function scheduleFix() {
    if (fixTimer) return;
    fixTimer = setTimeout(() => {
        fixTimer = null;
        void drainFix();
    }, DRAIN_DELAY_MS);
}

async function fixBatch(batch: JudgeInput[]) {
    const profile = getProfile(String(settings.store.judgeProfile ?? "") || undefined);
    const found = parseFixes(await chatWithRetry(profile, buildFixMessages(settings.store.fixPrompt, batch)));
    const now = new Date().toISOString();
    const updates: Record<string, DeArrowState> = {};
    for (const input of batch) {
        const current = DeArrowStates.get(input.topicId);
        if (current && current.originalTitle !== input.title) continue;
        const { fixes: _previous, ...rest } = baseState(input.topicId, input.title);
        const fixes = acceptFixes(input.title, found.get(input.topicId));
        updates[input.topicId] = { ...rest, ...(fixes.length ? { fixes } : {}), fixModel: profile?.model ?? "", fixCheckedAt: now, updatedAt: now };
    }
    DeArrowStates.setMany(updates);
}

async function drainFix() {
    if (fixDraining) return;
    fixDraining = true;
    try {
        while (fixQueue.size && isPluginEnabled("DeArrow") && settings.store.fixTypos) {
            const picked = Array.from(fixQueue.values()).slice(0, FIX_BATCH);
            for (const item of picked) {
                fixQueue.delete(item.topicId);
                fixing.add(item.topicId);
            }
            const claimed = await Promise.all(picked.map(item => claim("fix", item.topicId)));
            const batch = picked.filter((_, index) => claimed[index]);
            for (const item of picked) if (!batch.includes(item)) fixing.delete(item.topicId);
            if (!batch.length) continue;
            try {
                await fixBatch(batch);
                closeToast("dearrow-fix");
            } catch (error) {
                logger.warn("错别字修正失败", error);
                for (const item of batch) fixFailed.set(item.topicId, item.title);
                if (!(error instanceof AIError && (error.code === "NO_KEY" || error.code === "NO_PROFILE"))) batchToast("dearrow-fix", "错别字修正失败", batch, error);
            } finally {
                DeArrowStates.flush();
                for (const item of batch) {
                    fixing.delete(item.topicId);
                    release("fix", item.topicId);
                }
            }
        }
    } finally {
        fixDraining = false;
        schedule();
    }
}

async function rewrite(input: JudgeInput, automatic: boolean) {
    const { topicId, title } = input;
    if (rewriting.has(topicId)) return;
    const setPhase = (phase: string) => {
        rewriting.set(topicId, phase);
        refreshButtons(topicId);
    };
    setPhase("正在判断…");
    let claimed = false;
    try {
        claimed = await claim("rewrite", topicId);
        if (!claimed) {
            if (!automatic) showToast("另一个标签页正在改写这个话题，结果会自动同步过来", "info", { topicId, key: `dearrow:${topicId}`, onClick: () => focusTopic(topicId, "locate") });
            return;
        }
        // A judge request for this topic may already be on its way from the list; wait for it rather than send another.
        judgeQueue.delete(topicId);
        await judgeRuns.get(topicId)?.catch(() => undefined);
        if (typeof stateFor(topicId, title)?.verdict !== "boolean") await judgeBatch([input]);
        if (automatic && stateFor(topicId, title)?.verdict !== true) return;
        const profile = requireProfile(getProfile(String(settings.store.rewriteProfile ?? "") || undefined));
        setPhase("正在读取首帖…");
        const content = await buildTopicContent(topicId, {
            firstPostOnly: true,
            retries: profile.retryCount,
            onRetry: info => setPhase(`linux.do 限流，${info.delaySeconds} 秒后重试…`),
        });
        const images = profile.imageInput && content.images.length ? (await prepareImages(content.images, profile)).prepared : [];
        const body = content.text.replace(/^#1 [^\n]*：\n?/, "").trim();
        if (!body.replace(/\[图片#\d+[^\]]*\]/g, "").trim() && !images.length) {
            throw new Error(profile.imageInput ? "首帖只有图片，且图片准备失败" : "首帖只有图片，请在改写所用的 AI 配置中开启图片输入");
        }
        setPhase("正在改写标题…");
        const messages = buildRewriteMessages(settings.store.rewritePrompt, title, content.text, images.length);
        messages[1].content = userContent(messages[1].content as string, images);
        const rewritten = parseRewrite(await chatWithRetry(profile, messages));
        const current = DeArrowStates.get(topicId);
        if (current && current.originalTitle !== title) return;
        const now = new Date().toISOString();
        DeArrowStates.set(topicId, { ...baseState(topicId, title), rewrittenTitle: rewritten, rewriteModel: profile.model, rewrittenAt: now, updatedAt: now });
        closeToast(`dearrow:${topicId}`);
    } catch (error) {
        logger.warn(`改写话题 ${topicId} 失败`, error);
        errors.set(topicId, { kind: "rewrite", message: errorMessage(error), title });
        if (!automatic) showToast(`DeArrow 改写失败：${errorMessage(error)}`, "error", { topicId, key: `dearrow:${topicId}`, onClick: () => focusTopic(topicId, "locate") });
    } finally {
        if (claimed) {
            DeArrowStates.flush();
            release("rewrite", topicId);
        }
        rewriting.delete(topicId);
        refreshButtons(topicId);
        schedule();
    }
}

function pumpAuto() {
    while (autoActive < AUTO_CONCURRENCY && autoQueue.length) {
        const next = autoQueue.shift();
        if (!next || rewriting.has(next.topicId)) continue;
        autoActive++;
        void rewrite(next, true).finally(() => {
            autoActive--;
            pumpAuto();
        });
    }
}

function clearOverrides() {
    for (const id of overridden) setTitleOverride(id, null);
    overridden.clear();
    for (const id of marked) setTitleMark(id, null);
    marked.clear();
}

function process(rows: readonly TopicRow[]) {
    const automatic = inScope();
    const seen = new Set<string>();
    const now = new Date().toISOString();
    for (const row of rows) {
        if (seen.has(row.id) || !row.originalTitle) continue;
        seen.add(row.id);
        const stored = DeArrowStates.get(row.id);
        if (stored && stored.originalTitle !== row.originalTitle && !row.hidden) {
            DeArrowStates.set(row.id, { originalTitle: row.originalTitle, updatedAt: now });
            errors.delete(row.id);
        }
        const state = stateFor(row.id, row.originalTitle);
        const fixes = shownFixes(state);
        if (state?.rewrittenTitle) {
            setTitleOverride(row.id, state.rewrittenTitle);
            overridden.add(row.id);
        } else if (fixes.length) {
            setTitleOverride(row.id, { edits: fixes.map(fix => ({ ...fix, mark: fixMark(fix) })), highlight: FIX_HIGHLIGHT });
            overridden.add(row.id);
        } else if (overridden.delete(row.id)) {
            setTitleOverride(row.id, null);
        }
        const titleMark = state?.verdict === true ? "clickbait" : state?.rewrittenTitle || fixes.length ? "original" : null;
        if (titleMark) {
            setTitleMark(row.id, titleMark);
            marked.add(row.id);
        } else if (marked.delete(row.id)) {
            setTitleMark(row.id, null);
        }
        if (automatic && !row.hidden && settings.store.fixTypos && !state?.rewrittenTitle && !state?.fixCheckedAt && !fixing.has(row.id) && fixFailed.get(row.id) !== row.originalTitle && !heldElsewhere("fix", row.id)) {
            fixQueue.set(row.id, { topicId: row.id, title: row.originalTitle });
        }
        if (!automatic || row.hidden || errorFor(row.id, row.originalTitle)) continue;
        if (typeof state?.verdict !== "boolean" && !judging.has(row.id) && !rewriting.has(row.id) && !heldElsewhere("judge", row.id)) {
            judgeQueue.set(row.id, { topicId: row.id, title: row.originalTitle });
        } else if (settings.store.autoRewrite && state?.verdict === true && !state.rewrittenTitle && !rewriting.has(row.id) && !heldElsewhere("rewrite", row.id) && !autoQueue.some(item => item.topicId === row.id)) {
            autoQueue.push({ topicId: row.id, title: row.originalTitle });
        }
    }
    if (judgeQueue.size) scheduleDrain();
    if (fixQueue.size) scheduleFix();
    pumpAuto();
}

export default definePlugin({
    name: "DeArrow",
    displayName: "DeArrow 标题党改写",
    description: "在作用范围内的话题列表里自动用 AI 判断标题党，并根据首帖改写成具体中立的标题；其他列表也显示按钮和已改写的标题，可手动改写。还可修正标题里的错别字，改过的字带点状下划线。悬停 ✦ 按钮可临时查看原标题。改写和修正只影响显示，屏蔽规则始终匹配原标题。",
    tags: ["ai", "topics"],
    icon: DeArrowIcon,
    settings,
    start() {
        scopeRegex = null;
        registerDecorator({ id: "dearrow", order: 20, render: renderButton });
        registerProcessor({ id: "dearrow", run: process });
        unsubs.push(subscribe("dataChange", ({ store, ids }) => {
            if (store !== "dearrow") return;
            for (const id of ids) refreshButtons(id);
            schedule();
        }));
    },
    stop() {
        for (const unsub of unsubs.splice(0)) unsub();
        unregisterDecorator("dearrow");
        unregisterProcessor("dearrow");
        clearOverrides();
        judgeQueue.clear();
        fixQueue.clear();
        autoQueue.length = 0;
    },
    onSettingsChange() {
        scopeRegex = null;
        if (!settings.store.autoRewrite) autoQueue.length = 0;
        if (!settings.store.fixTypos) fixQueue.clear();
        schedule();
    },
    events: {
        navigate() {
            judgeQueue.clear();
            fixQueue.clear();
            autoQueue.length = 0;
            schedule();
        },
    },
});
