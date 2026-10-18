/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showToast } from "@api/Notifications";
import { autoGrow, Button, IconButton, InfoTip, Select, StackField, SubTabs, Tabs, TextInput } from "@components/controls";
import { CloseIcon, PlusIcon, TrashIcon } from "@components/icons";
import { classes } from "@utils/css";
import { h } from "@utils/dom";
import { pinyinInitial, sortByPinyin } from "@utils/pinyin";
import { splitList } from "@utils/text";

import type { RulesAccess } from "./dialogs";
import { type BlockRules, countRules, dedupe, fold, type RegexRule, regexError } from "./rules";

type ListKey = "titleKeywords" | "categories" | "tags";

export type KeywordSort = "pinyin" | "added";

export interface SortPreference {
    get(): KeywordSort;
    set(value: KeywordSort): void;
}

const SORT_CHOICES = [{ label: "按拼音", value: "pinyin" }, { label: "按添加顺序", value: "added" }];
type RegexKey = "titleRegex" | "categoryRegex" | "tagRegex";

const GROUPS: Array<{ id: string; label: string; noun: string; list: ListKey; regex: RegexKey; listHint: string }> = [
    { id: "title", label: "标题", noun: "关键词", list: "titleKeywords", regex: "titleRegex", listHint: "标题包含任一关键词即屏蔽（忽略大小写）。" },
    { id: "category", label: "类别", noun: "类别", list: "categories", regex: "categoryRegex", listHint: "类别名称完全相同即屏蔽（忽略大小写）。" },
    { id: "tag", label: "标签", noun: "标签", list: "tags", regex: "tagRegex", listHint: "任一标签完全相同即屏蔽（忽略大小写）。" },
];

export function renderRegexList(rules: RegexRule[], onSave: (next: RegexRule[]) => void, { notes = true, placeholder = "正则表达式，例如 ^\\[求助\\] 或 /docker/i" }: { notes?: boolean; placeholder?: string } = {}): HTMLElement {
    const draft = rules.map(rule => ({ ...rule }));
    const root = h("div", { class: classes("ldpp-regex-list", !notes && "no-notes") });
    const commit = () => {
        const clean = draft.filter(rule => rule.pattern.trim()).map(rule => ({ pattern: rule.pattern.trim(), note: rule.note.trim() }));
        if (clean.some(rule => regexError(rule.pattern))) return;
        onSave(clean);
    };
    const render = () => {
        root.replaceChildren(
            ...draft.map((rule, index) => {
                const error = h("span", { class: "ldpp-regex-error" });
                // A wrapping box, so long patterns (up to ~100 characters in real rule sets) are shown whole.
                const pattern = TextInput({ value: rule.pattern, monospace: true, multiline: true, rows: 1, placeholder }) as HTMLTextAreaElement;
                pattern.classList.add("ldpp-regex-pattern");
                pattern.addEventListener("keydown", event => {
                    if (event.key !== "Enter" || event.isComposing) return;
                    event.preventDefault();
                    pattern.blur();
                });
                const validate = () => {
                    const message = rule.pattern.trim() ? regexError(rule.pattern) : null;
                    pattern.classList.toggle("is-invalid", Boolean(message));
                    error.textContent = message ? `无效：${message}` : "";
                };
                pattern.addEventListener("input", () => {
                    if (pattern.value.includes("\n")) pattern.value = pattern.value.replace(/\n/g, "");
                    rule.pattern = pattern.value;
                    validate();
                });
                pattern.addEventListener("change", commit);
                const note = notes ? TextInput({ value: rule.note, placeholder: "备注（可选）", onInput: value => { rule.note = value; }, onChange: commit }) : null;
                validate();
                return h("div", { class: "ldpp-regex-row" }, pattern, note, IconButton(TrashIcon(), { title: "删除", onClick: () => { draft.splice(index, 1); commit(); render(); } }), error);
            }),
            Button("新增正则", { icon: PlusIcon(), small: true, onClick: () => { draft.push({ pattern: "", note: "" }); render(); root.querySelector<HTMLInputElement>(".ldpp-regex-row:last-of-type input")?.focus(); } }),
        );
    };
    render();
    return root;
}

/**
 * Keyword list editor: search box, add box, keywords as content-width chips that wrap, and 「批量编辑」 for the whole
 * list (comma-separated, as the old script stored it). In pinyin order each letter is a small marker inside the flow,
 * with an A–Z bar to jump between them.
 *
 * Why chips rather than a grid: measured on a real 563-keyword list, fixed 118 px grid cells held keywords whose
 * median width is 28 px, and full-width letter rows plus half-empty last rows per letter made the list 3,887 px tall.
 */
export function renderKeywordList(initial: readonly string[], save: (next: string[]) => void, { noun = "关键词", sort }: { noun?: string; sort?: SortPreference } = {}): HTMLElement {
    let values = dedupe([...initial]);
    let query = "";
    let bulk = false;
    let order: KeywordSort = sort?.get() ?? "pinyin";
    const root = h("div", { class: "ldpp-keywords" });
    const commit = (next: string[]) => {
        values = dedupe(next);
        save(values);
        render();
    };

    const search = h("input", { type: "search", class: "ldpp-input ldpp-keywords-search" });
    search.addEventListener("input", () => { query = search.value.trim(); renderGrid(); });
    const addBox = h("input", { type: "text", class: "ldpp-input ldpp-keywords-add", placeholder: `添加${noun}，多个用逗号分隔` });
    const add = () => {
        const fresh = splitList(addBox.value);
        if (!fresh.length) return;
        const known = new Set(values.map(fold));
        const added = fresh.filter(item => !known.has(fold(item)));
        addBox.value = "";
        if (!added.length) {
            showToast(`${fresh.length > 1 ? "这些" : "这个"}${noun}已经存在`, "info");
            return;
        }
        commit([...values, ...added]);
        addBox.focus();
    };
    addBox.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        add();
    });
    const status = h("span", { class: "ldpp-muted ldpp-keywords-status" });
    const sortSelect = Select(order, SORT_CHOICES, value => {
        order = value === "added" ? "added" : "pinyin";
        sort?.set(order);
        renderGrid();
    });
    sortSelect.classList.add("ldpp-keywords-sort");
    sortSelect.title = "排序";
    const grid = h("div", { class: "ldpp-keywords-grid" });
    const index = h("nav", { class: "ldpp-keywords-index", attrs: { "aria-label": "按首字母跳转" } });
    const jump = (letter: string) => grid.querySelector<HTMLElement>(`.ldpp-keywords-letter[data-letter="${CSS.escape(letter)}"]`)?.scrollIntoView?.({ block: "start", behavior: "smooth" });

    const highlight = (text: string) => {
        if (!query) return text;
        const at = text.toLowerCase().indexOf(query.toLowerCase());
        if (at < 0) return text;
        return [text.slice(0, at), h("mark", { class: "ldpp-keywords-hit" }, text.slice(at, at + query.length)), text.slice(at + query.length)];
    };
    const cell = (value: string) => h("div", { class: "ldpp-keyword", title: value },
        h("span", { class: "ldpp-keyword-text" }, highlight(value)),
        IconButton(CloseIcon(12), { title: `删除「${value}」`, className: "ldpp-keyword-remove", onClick: () => commit(values.filter(item => item !== value)) }),
    );
    const renderGrid = () => {
        const needle = query.toLowerCase();
        const matched = needle ? values.filter(value => value.toLowerCase().includes(needle)) : values;
        status.textContent = needle ? `匹配 ${matched.length} / ${values.length} 个` : `共 ${values.length} 个`;
        if (order === "pinyin") {
            const cells: HTMLElement[] = [];
            const letters: string[] = [];
            for (const value of sortByPinyin(matched)) {
                const letter = pinyinInitial(value);
                if (letter !== letters.at(-1)) {
                    letters.push(letter);
                    cells.push(h("span", { class: "ldpp-keywords-letter", dataset: { letter } }, letter));
                }
                cells.push(cell(value));
            }
            grid.replaceChildren(...cells);
            index.replaceChildren(...letters.map(letter => h("button", { type: "button", class: "ldpp-keywords-jump", title: `跳到 ${letter}`, on: { click: () => jump(letter) } }, letter)));
            index.hidden = letters.length < 2;
        } else {
            grid.replaceChildren(...matched.map(cell));
            index.replaceChildren();
            index.hidden = true;
        }
        const shown = matched;
        if (!shown.length) grid.append(h("p", { class: "ldpp-muted ldpp-keywords-empty" }, needle ? `没有包含「${query}」的${noun}。` : `还没有${noun}。`));
    };

    const render = () => {
        search.placeholder = `在 ${values.length} 个${noun}中搜索`;
        if (bulk) {
            const area = autoGrow(h("textarea", { class: "ldpp-input ldpp-keywords-bulk", value: values.join(", "), spellcheck: false, rows: 4 }), () => Math.round(window.innerHeight * 0.6));
            root.replaceChildren(
                h("div", { class: "ldpp-keywords-toolbar" },
                    h("span", { class: "ldpp-muted ldpp-keywords-status" }, `批量编辑：逗号或换行分隔，共 ${values.length} 个`),
                    h("span", { class: "ldpp-search-spacer" }),
                    Button("取消", { small: true, onClick: () => { bulk = false; render(); } }),
                    Button("保存", { small: true, kind: "primary", onClick: () => { bulk = false; commit(splitList(area.value)); } }),
                ),
                area,
            );
            return;
        }
        root.replaceChildren(
            h("div", { class: "ldpp-keywords-head" },
                h("div", { class: "ldpp-keywords-toolbar" },
                    search,
                    addBox,
                    Button("添加", { icon: PlusIcon(), onClick: add }),
                ),
                h("div", { class: "ldpp-keywords-meta" },
                    status,
                    h("span", { class: "ldpp-search-spacer" }),
                    sortSelect,
                    Button("批量编辑", { small: true, onClick: () => { bulk = true; render(); } }),
                ),
                index,
            ),
            grid,
        );
        renderGrid();
    };
    render();
    return root;
}

export function renderRulesEditor(access: RulesAccess, sort?: SortPreference): HTMLElement {
    const count = h("span");
    const summary = h("p", { class: "ldpp-muted ldpp-rules-summary" }, count, InfoTip("在话题列表中悬停某个话题，点击行尾的 ⦸ 按钮可以从标题中划词添加规则。"));
    const refreshSummary = () => { count.textContent = `当前共 ${countRules(access.get())} 条屏蔽规则。`; };
    let refreshSubTabs: (() => void) | null = null;
    const update = (patch: Partial<BlockRules>) => {
        access.set({ ...access.get(), ...patch });
        refreshSummary();
        refreshSubTabs?.();
    };
    const tabs = Tabs(GROUPS.map(group => ({
        id: group.id,
        label: group.label,
        render: () => {
            const sub = SubTabs([
            {
                label: () => `关键词（${access.get()[group.list].length}）`,
                render: () => h("div", null,
                    h("p", { class: "ldpp-muted ldpp-rule-hint" }, group.listHint.replace("每行一个，也可用逗号分隔。", "").trim()),
                    renderKeywordList(access.get()[group.list], next => update({ [group.list]: next }), { noun: group.noun, sort }),
                ),
            },
            {
                label: () => `正则（${access.get()[group.regex].length}）`,
                render: () => StackField(`${group.label}正则`, renderRegexList(access.get()[group.regex], next => update({ [group.regex]: next })), "支持 /模式/标志 写法（如 /docker/i）；不带斜杠时区分大小写。"),
            },
            ]);
            refreshSubTabs = sub.refresh;
            return h("div", { class: "ldpp-rule-group" }, sub.el);
        },
    })));
    refreshSummary();
    return h("div", { class: "ldpp-rules-editor" }, tabs.list, tabs.panel, summary);
}
