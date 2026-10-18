/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { openDialog } from "@api/Dialog";
import { dispatch } from "@api/Events";
import { currentRoute } from "@api/Navigation";
import { showToast } from "@api/Notifications";
import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { registerProcessor, schedule, unregisterProcessor } from "@api/TopicList";
import { autoGrow, IconButton } from "@components/controls";
import { BanIcon, CloseIcon, FilterIcon, SlidersIcon } from "@components/icons";
import { append, h, mark, setClass } from "@utils/dom";
import { normalizeText, splitList } from "@utils/text";
import definePlugin, { OptionType } from "@utils/types";

import { openBlockPicker } from "../topicBlocker/dialogs";
import { type BlockReason, compileRules, evaluate, fold, REASON_LABEL, withAdditions, withoutReasons } from "../topicBlocker/rules";
import { keywordSortPreference, rulesAccess } from "../topicBlocker";
import { renderSearchRulesManager, type SearchRulesStore } from "./manager";
import { EMPTY_SEARCH_RULE, evaluateSearch, normalizeSearchRule, normalizeSearchRules, primaryTerm, type SearchRule, type SearchVerdict } from "./query";

const RESULT = ".fps-result";
const VERDICT_LABEL: Record<SearchVerdict["kind"], string> = { blacklist: "屏蔽词", regex: "正则", whitelist: "缺少必含词" };

export const settings = definePluginSettings({
    rules: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, SearchRule>,
    },
    manager: {
        type: OptionType.COMPONENT,
        description: "搜索词规则",
        render: (): HTMLElement => renderSearchRulesManager(rulesStore, keywordSortPreference),
    },
    applyBlockerRules: {
        type: OptionType.BOOLEAN,
        description: "搜索结果同时套用「话题屏蔽」的标题 / 类别 / 标签规则。",
        default: false,
    },
    matchBlurb: {
        type: OptionType.BOOLEAN,
        description: "过滤时同时匹配结果摘要（默认只匹配标题）。",
        default: false,
    },
    fabStyle: {
        type: OptionType.SELECT,
        description: "过滤计数按钮样式",
        options: [
            { label: "图标 + 计数", value: "pill", default: true },
            { label: "圆形图标 + 角标", value: "badge" },
        ],
    },
});

let reveal = false;

function currentTerm(): string {
    const route = currentRoute();
    return route.kind === "search" ? primaryTerm(route.searchQuery) : "";
}

const rulesStore: SearchRulesStore = {
    all: () => normalizeSearchRules(settings.store.rules),
    get: term => getRule(term),
    set: (term, rule) => setRule(term, rule),
};

export function getRule(term: string): SearchRule {
    return normalizeSearchRules(settings.store.rules)[term] ?? { ...EMPTY_SEARCH_RULE };
}

export function setRule(term: string, rule: SearchRule) {
    const all = normalizeSearchRules(settings.store.rules);
    const clean = normalizeSearchRule(rule);
    if (clean.blacklist.length || clean.whitelist.length || clean.regex.length) all[term] = clean;
    else delete all[term];
    settings.store.rules = all;
}

function resultFacts(result: Element) {
    const title = normalizeText(result.querySelector(".topic-title")?.textContent ?? result.querySelector("a.search-link")?.textContent);
    const blurb = normalizeText(result.querySelector(".blurb")?.textContent);
    const category = normalizeText(result.querySelector(".badge-category__name")?.textContent);
    const tags = Array.from(new Set(Array.from(result.querySelectorAll<HTMLElement>("[data-tag-name], .discourse-tag"), tag => normalizeText(tag.dataset.tagName ?? tag.textContent)).filter(Boolean)));
    return { title, blurb, category, tags };
}

interface ResultVerdict {
    search: SearchVerdict[];
    blocker: BlockReason[];
}

const verdicts = new WeakMap<HTMLElement, ResultVerdict>();

function blockResult(term: string, result: Element) {
    const facts = resultFacts(result);
    openBlockPicker({
        dialogTitle: "屏蔽此搜索结果",
        title: facts.title,
        category: facts.category,
        tags: facts.tags,
        keywordTarget: `「${term}」的屏蔽词`,
        info: `关键词只加入「${term}」的搜索屏蔽词；勾选的类别、标签加入「话题屏蔽」规则（在搜索页生效需开启「搜索结果同时套用话题屏蔽规则」）。`,
        apply: ({ keywords, categories, tags }) => {
            if (keywords.length) {
                const rule = getRule(term);
                const known = new Set(rule.blacklist.map(fold));
                setRule(term, { ...rule, blacklist: [...rule.blacklist, ...keywords.filter(keyword => !known.has(fold(keyword)))] });
            }
            if (categories.length || tags.length) rulesAccess.set(withAdditions(rulesAccess.get(), { categories, tags }));
            showToast("已添加屏蔽规则", "success");
        },
    });
}

export function withoutSearchVerdicts(rule: SearchRule, removed: SearchVerdict[]): SearchRule {
    const keywords = new Set(removed.filter(item => item.kind === "blacklist").map(item => fold(item.value)));
    const patterns = new Set(removed.filter(item => item.kind === "regex").map(item => item.value));
    return {
        blacklist: rule.blacklist.filter(keyword => !keywords.has(fold(keyword))),
        whitelist: removed.some(item => item.kind === "whitelist") ? [] : rule.whitelist,
        regex: rule.regex.filter(pattern => !patterns.has(pattern)),
    };
}

function unblockResult(term: string, title: string, verdict: ResultVerdict) {
    const selected = new Set<SearchVerdict | BlockReason>([...verdict.search, ...verdict.blocker]);
    const item = (key: SearchVerdict | BlockReason, kind: string, rule: string) => {
        const input = h("input", { type: "checkbox", checked: true });
        input.addEventListener("change", () => {
            if (input.checked) selected.add(key);
            else selected.delete(key);
        });
        return h("li", null, h("label", { class: "ldpp-check" }, input, h("span", { class: "ldpp-reason-kind" }, kind), h("code", { class: "ldpp-reason-rule" }, rule)));
    };
    const list = h("ul", { class: "ldpp-reason-list" },
        verdict.search.map(entry => item(entry, entry.kind === "whitelist" ? "必含词" : `搜索${VERDICT_LABEL[entry.kind]}`, entry.value)),
        verdict.blocker.map(reason => item(reason, `话题屏蔽 · ${REASON_LABEL[reason.kind]}`, reason.rule)),
    );
    openDialog({
        title: "过滤原因",
        icon: BanIcon(18),
        danger: true,
        info: `勾选要删除的规则。搜索规则只作用于「${term}」；「必含词」会整组清空。`,
        size: "medium",
        body: h("div", { class: "ldpp-block-dialog" },
            h("p", { class: "ldpp-block-title" }, title),
            list,
        ),
        actions: [
            { label: "关闭" },
            {
                label: "删除所选规则",
                kind: "danger",
                onClick: () => {
                    if (!selected.size) {
                        showToast("请至少勾选一条规则", "info");
                        return false;
                    }
                    const search = verdict.search.filter(entry => selected.has(entry));
                    const blocker = verdict.blocker.filter(reason => selected.has(reason));
                    if (search.length) setRule(term, withoutSearchVerdicts(getRule(term), search));
                    if (blocker.length) rulesAccess.set(withoutReasons(rulesAccess.get(), blocker));
                    showToast(`已删除 ${selected.size} 条规则`, "success");
                },
            },
        ],
    });
}

const HOVER_SIZE = 24;
const HOVER_OFFSET_TOP = 8;
const HOVER_OFFSET_RIGHT = 10;
const VIEWPORT_GAP = 6;

let hoverButton: HTMLButtonElement | null = null;
let hoverItem: HTMLElement | null = null;
let hoverFrame = 0;

function placeHoverButton() {
    hoverFrame = 0;
    const button = hoverButton;
    const item = hoverItem;
    if (!button) return;
    const rect = item?.isConnected ? item.getBoundingClientRect() : null;
    if (!rect || !rect.width || !rect.height || rect.bottom < 0 || rect.top > window.innerHeight) {
        hideHoverButton();
        return;
    }
    const left = Math.min(Math.max(rect.right - HOVER_OFFSET_RIGHT - HOVER_SIZE, VIEWPORT_GAP), window.innerWidth - HOVER_SIZE - VIEWPORT_GAP);
    const top = Math.min(Math.max(rect.top + HOVER_OFFSET_TOP, VIEWPORT_GAP), window.innerHeight - HOVER_SIZE - VIEWPORT_GAP);
    button.style.left = `${Math.round(left)}px`;
    button.style.top = `${Math.round(top)}px`;
}

function queuePlacement() {
    if (hoverItem && !hoverFrame) hoverFrame = requestAnimationFrame(placeHoverButton);
}

function showHoverButton(item: HTMLElement) {
    const button = hoverButton;
    if (!button) return;
    hoverItem = item;
    const filtered = item.classList.contains("ldpp-search-revealed");
    setClass(button, "is-blocked", filtered);
    const tip = filtered ? "查看过滤原因" : "屏蔽该结果";
    if (button.title !== tip) {
        button.title = tip;
        button.setAttribute("aria-label", tip);
    }
    placeHoverButton();
    setClass(button, "is-visible", true);
}

function hideHoverButton() {
    hoverItem = null;
    if (hoverButton) setClass(hoverButton, "is-visible", false);
}

function onHoverOver(event: Event) {
    const target = event.target as Element | null;
    if (!hoverButton || !target?.closest) return;
    if (hoverButton.contains(target)) return;
    const item = target.closest<HTMLElement>(RESULT);
    if (item) {
        if (item !== hoverItem || !hoverButton.classList.contains("is-visible")) showHoverButton(item);
    } else if (hoverItem) {
        hideHoverButton();
    }
}

function onHoverOut(event: MouseEvent) {
    if (!event.relatedTarget) hideHoverButton();
}

function onTouch(event: PointerEvent) {
    if (event.pointerType !== "touch") return;
    const item = (event.target as Element | null)?.closest?.<HTMLElement>(RESULT);
    if (item) showHoverButton(item);
}

function ensureHoverButton() {
    if (hoverButton?.isConnected) return;
    hoverButton = mark(h("button", {
        type: "button",
        class: "ldpp-search-hover",
        on: {
            click: (event: MouseEvent) => {
                event.preventDefault();
                event.stopPropagation();
                const item = hoverItem;
                const term = currentTerm();
                if (!item || !term) return;
                const verdict = verdicts.get(item);
                const title = resultFacts(item).title;
                if (verdict && item.classList.contains("ldpp-search-revealed")) unblockResult(term, title, verdict);
                else blockResult(term, item);
            },
        },
    }, BanIcon(24)), "search-hover");
    document.body.appendChild(hoverButton);
    document.addEventListener("mouseover", onHoverOver, true);
    document.addEventListener("mouseout", onHoverOut, true);
    document.addEventListener("pointerdown", onTouch, true);
    window.addEventListener("scroll", queuePlacement, true);
    window.addEventListener("resize", queuePlacement);
}

function removeHoverButton() {
    if (hoverFrame) cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    hoverItem = null;
    hoverButton?.remove();
    hoverButton = null;
    document.removeEventListener("mouseover", onHoverOver, true);
    document.removeEventListener("mouseout", onHoverOut, true);
    document.removeEventListener("pointerdown", onTouch, true);
    window.removeEventListener("scroll", queuePlacement, true);
    window.removeEventListener("resize", queuePlacement);
}

type FieldKey = "blacklist" | "whitelist" | "regex";

const FIELDS: Array<{ key: FieldKey; label: string; placeholder: string }> = [
    { key: "blacklist", label: "屏蔽", placeholder: "逗号分隔，标题包含任一即隐藏" },
    { key: "whitelist", label: "必含", placeholder: "逗号分隔，标题至少包含其一" },
    { key: "regex", label: "正则", placeholder: "每行一个，默认忽略大小写" },
];

let floatCleanup: (() => void) | null = null;

const fieldText = (rule: SearchRule, key: FieldKey) => key === "regex" ? rule.regex.join("\n") : rule[key].join(", ");

function fieldOf(wrapper: HTMLElement, key: FieldKey): HTMLTextAreaElement | null {
    return wrapper.querySelector<HTMLTextAreaElement>(`textarea[data-field="${key}"]`);
}

const fieldMax = () => Math.max(150, Math.round(window.innerHeight * 0.3));

function autosize(area: HTMLTextAreaElement) {
    area.dispatchEvent(new Event("input"));
}

function readFields(wrapper: HTMLElement): SearchRule {
    const value = (key: FieldKey) => fieldOf(wrapper, key)?.value ?? "";
    return {
        blacklist: splitList(value("blacklist")),
        whitelist: splitList(value("whitelist")),
        regex: value("regex").split("\n").map(line => line.trim()).filter(Boolean),
    };
}

function saveFields(wrapper: HTMLElement) {
    const term = wrapper.dataset.term;
    if (!term) return;
    const next = normalizeSearchRule(readFields(wrapper));
    if (JSON.stringify(next) !== JSON.stringify(getRule(term))) setRule(term, next);
}

function syncFields(wrapper: HTMLElement, rule: SearchRule) {
    for (const { key } of FIELDS) {
        const area = fieldOf(wrapper, key);
        if (!area) continue;
        const text = fieldText(rule, key);
        if (area.value !== text) area.value = text;
        autosize(area);
    }
}

function setOpen(wrapper: HTMLElement, open: boolean) {
    floatCleanup?.();
    floatCleanup = null;
    setClass(wrapper, "is-open", open);
    wrapper.querySelector(".ldpp-search-fab")?.setAttribute("aria-expanded", String(open));
    if (!open) return;
    const onPointer = (event: Event) => {
        if (!wrapper.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
        if (event.key === "Escape") close();
    };
    const close = () => {
        saveFields(wrapper);
        setOpen(wrapper, false);
    };
    document.addEventListener("mousedown", onPointer, true);
    document.addEventListener("keydown", onKey, true);
    floatCleanup = () => {
        document.removeEventListener("mousedown", onPointer, true);
        document.removeEventListener("keydown", onKey, true);
    };
}

function buildFloat(): HTMLElement {
    const wrapper = mark(h("div", { class: "ldpp-search-float" }), "search-float");
    const fab = h("button", {
        type: "button",
        class: "ldpp-search-fab",
        attrs: { "aria-expanded": "false", "aria-label": "搜索过滤" },
        on: { click: () => setOpen(wrapper, !wrapper.classList.contains("is-open")) },
    }, BanIcon(28));
    const rows = FIELDS.map(({ key, label, placeholder }) => {
        const area = autoGrow(h("textarea", { class: "ldpp-input ldpp-search-field", rows: 1, spellcheck: false, placeholder, dataset: { field: key } }), fieldMax);
        area.addEventListener("change", () => saveFields(wrapper));
        area.addEventListener("keydown", event => {
            if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            saveFields(wrapper);
            area.blur();
        });
        return h("label", { class: "ldpp-search-row" }, h("span", { class: "ldpp-search-label" }, `${label}：`), area);
    });
    const panel = h("div", { class: "ldpp-search-panel", attrs: { role: "dialog", "aria-label": "搜索过滤" } },
        h("div", { class: "ldpp-search-head" },
            FilterIcon(14),
            h("strong", { class: "ldpp-search-term" }),
            h("span", { class: "ldpp-search-spacer" }),
            IconButton(SlidersIcon(14), { title: "在设置中查看全部搜索词的规则", onClick: () => { saveFields(wrapper); setOpen(wrapper, false); dispatch("openSettings", { tab: "features", plugin: "SearchFilter" }); } }),
            IconButton(CloseIcon(14), { title: "收起（Esc）", onClick: () => { saveFields(wrapper); setOpen(wrapper, false); } }),
        ),
        rows,
    );
    append(wrapper, fab, panel);
    return wrapper;
}

/**
 * The original blocker shows two floating buttons on search pages: the 「⊘ N」 count at top 140
 * (click to show / re-hide filtered results) and the red ⊘ at top 193 that opens the rule editor.
 */
function renderCounter(term: string, hiddenCount: number) {
    let wrapper = document.querySelector<HTMLElement>(".ldpp-search-count-float");
    if (!wrapper) {
        wrapper = mark(h("div", { class: "ldpp-search-count-float" },
            h("button", {
                type: "button",
                class: "ldpp-search-count",
                on: { click: () => { reveal = !reveal; schedule(); } },
            }, BanIcon(18), h("span", { class: "ldpp-float-count ldpp-search-count-value" })),
        ), "search-count");
    }
    if (!wrapper.isConnected) document.body.appendChild(wrapper);
    const button = wrapper.querySelector<HTMLButtonElement>(".ldpp-search-count");
    const value = wrapper.querySelector<HTMLElement>(".ldpp-search-count-value");
    if (!button || !value) return;
    const badgeStyle = settings.store.fabStyle === "badge";
    setClass(button, "ldpp-float-pill", !badgeStyle);
    setClass(button, "is-badge-style", badgeStyle);
    setClass(button, "is-revealing", reveal);
    const tip = reveal ? `恢复隐藏「${term}」中被过滤的 ${hiddenCount} 条结果` : `临时显示「${term}」中被过滤的 ${hiddenCount} 条结果`;
    if (button.title !== tip) button.title = tip;
    if (button.getAttribute("aria-pressed") !== String(reveal)) button.setAttribute("aria-pressed", String(reveal));
    const text = String(hiddenCount);
    if (value.textContent !== text) value.textContent = text;
    const hideValue = badgeStyle && !hiddenCount;
    if (value.hidden !== hideValue) value.hidden = hideValue;
}

function removeFloat() {
    floatCleanup?.();
    floatCleanup = null;
    document.querySelector(".ldpp-search-float")?.remove();
    document.querySelector(".ldpp-search-count-float")?.remove();
}

function renderFloat(term: string, hiddenCount: number, rule: SearchRule) {
    let wrapper = document.querySelector<HTMLElement>(".ldpp-search-float");
    if (!wrapper) wrapper = buildFloat();
    if (!wrapper.isConnected) document.body.appendChild(wrapper);
    if (wrapper.dataset.term !== term) {
        if (wrapper.dataset.term) saveFields(wrapper);
        wrapper.dataset.term = term;
        syncFields(wrapper, rule);
    } else if (!wrapper.contains(document.activeElement)) {
        syncFields(wrapper, rule);
    }
    const title = `搜索过滤「${term}」`;
    const termEl = wrapper.querySelector<HTMLElement>(".ldpp-search-term");
    if (termEl && termEl.textContent !== title) {
        termEl.textContent = title;
        termEl.title = title;
    }
    const fab = wrapper.querySelector<HTMLElement>(".ldpp-search-fab");
    if (fab && fab.title !== title) fab.title = title;
    renderCounter(term, hiddenCount);
}

function process() {
    const term = currentTerm();
    if (!term) {
        removeFloat();
        removeHoverButton();
        return;
    }
    const rule = getRule(term);
    const blocker = settings.store.applyBlockerRules && isPluginEnabled("TopicBlocker") ? compileRules(rulesAccess.get()) : null;
    let hiddenCount = 0;
    for (const result of Array.from(document.querySelectorAll<HTMLElement>(RESULT))) {
        const facts = resultFacts(result);
        const text = settings.store.matchBlurb ? `${facts.title} ${facts.blurb}` : facts.title;
        const search = evaluateSearch(rule, text);
        const blocked = blocker ? evaluate(blocker, facts) : [];
        verdicts.set(result, { search, blocker: blocked });
        const hidden = search.length + blocked.length > 0;
        if (hidden) hiddenCount++;
        setClass(result, "ldpp-search-hidden", hidden && !reveal);
        setClass(result, "ldpp-search-revealed", hidden && reveal);
        const tip = [
            ...search.map(item => `${VERDICT_LABEL[item.kind]}：${item.value}`),
            ...blocked.map(reason => `话题屏蔽 · ${REASON_LABEL[reason.kind]}：${reason.rule}`),
        ].join("\n");
        if (result.title !== tip) result.title = tip;
    }
    ensureHoverButton();
    if (hoverItem && !hoverItem.isConnected) hideHoverButton();
    else if (hoverItem) showHoverButton(hoverItem);
    renderFloat(term, hiddenCount, rule);
}

export default definePlugin({
    name: "SearchFilter",
    displayName: "搜索过滤",
    description: "在搜索页右侧的悬浮按钮里，按搜索词分别保存「屏蔽 / 必含 / 正则」规则过滤结果，可一键显示被过滤的结果。",
    tags: ["search"],
    icon: FilterIcon,
    enabledByDefault: true,
    settings,
    start() {
        registerProcessor({ id: "search-filter", run: process });
    },
    stop() {
        unregisterProcessor("search-filter");
        removeFloat();
        removeHoverButton();
        for (const el of Array.from(document.querySelectorAll(".ldpp-search-hidden, .ldpp-search-revealed"))) el.classList.remove("ldpp-search-hidden", "ldpp-search-revealed");
    },
    onSettingsChange() {
        schedule();
    },
});
