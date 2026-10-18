/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { confirmDialog } from "@api/Dialog";
import { Button, Select, SubTabs } from "@components/controls";
import { TrashIcon } from "@components/icons";
import { h } from "@utils/dom";
import { sortByPinyin } from "@utils/pinyin";

import { renderKeywordList, renderRegexList, type SortPreference } from "../topicBlocker/editor";
import { EMPTY_SEARCH_RULE, type SearchRule } from "./query";

export interface SearchRulesStore {
    all(): Record<string, SearchRule>;
    get(term: string): SearchRule;
    set(term: string, rule: SearchRule): void;
}

const hint = (text: string) => h("p", { class: "ldpp-muted ldpp-settings-group-desc" }, text);

const size = (rule: SearchRule) => rule.blacklist.length + rule.whitelist.length + rule.regex.length;

/**
 * Every search term's rules in one place. Before this they were only visible on that term's search page,
 * in the floating panel's narrow box (one real term has 32 blocked words).
 */
export function renderSearchRulesManager(store: SearchRulesStore, sort?: SortPreference): HTMLElement {
    const root = h("div", { class: "ldpp-search-rules" });
    let selected = "";
    const render = () => {
        const all = store.all();
        const terms = sortByPinyin(Object.keys(all));
        if (!terms.length) {
            root.replaceChildren(h("p", { class: "ldpp-muted" }, "还没有搜索词规则。在搜索页右侧点红色 ⊘，即可为当前搜索词添加。"));
            return;
        }
        if (!terms.includes(selected)) selected = terms[0];
        const rule = all[selected];
        const picker = Select(selected, terms.map(term => ({ label: `${term}（${size(all[term])}）`, value: term })), value => { selected = value; render(); });
        picker.classList.add("ldpp-search-rules-term");
        const relabel = () => {
            const option = Array.from(picker.options).find(item => item.value === selected);
            if (option) option.textContent = `${selected}（${size(store.get(selected))}）`;
        };
        const patch = (change: Partial<SearchRule>) => {
            const next = { ...store.get(selected), ...change };
            store.set(selected, next);
            if (!size(next)) render();
            else {
                relabel();
                tabs.refresh();
            }
        };
        const tabs = SubTabs([
            { label: () => `屏蔽词（${store.get(selected).blacklist.length}）`, render: () => h("div", null, hint("标题包含任一屏蔽词即隐藏该结果（忽略大小写）。"), renderKeywordList(store.get(selected).blacklist, blacklist => patch({ blacklist }), { noun: "屏蔽词", sort })) },
            { label: () => `必含词（${store.get(selected).whitelist.length}）`, render: () => h("div", null, hint("设置后，标题至少包含其中一个才显示。"), renderKeywordList(store.get(selected).whitelist, whitelist => patch({ whitelist }), { noun: "必含词", sort })) },
            { label: () => `正则（${store.get(selected).regex.length}）`, render: () => h("div", null, hint("标题匹配任一正则即隐藏。"), renderRegexList(store.get(selected).regex.map(pattern => ({ pattern, note: "" })), next => patch({ regex: next.map(item => item.pattern) }), { notes: false, placeholder: "正则表达式，默认忽略大小写；也可写 /模式/标志" })) },
        ]);
        root.replaceChildren(
            h("div", { class: "ldpp-search-rules-head" },
                h("span", { class: "ldpp-field-label" }, `搜索词（${terms.length}）`),
                picker,
                Button("删除这个搜索词的全部规则", {
                    kind: "delete",
                    icon: TrashIcon(),
                    onClick: async () => {
                        if (!await confirmDialog(`删除「${selected}」的 ${size(rule)} 条搜索规则？`, { title: "删除搜索词规则", danger: true, okLabel: "删除" })) return;
                        store.set(selected, { ...EMPTY_SEARCH_RULE });
                        render();
                    },
                }),
            ),
            // One list at a time: stacked, the three blocks overflowed the dialog (783 / 716 px).
            tabs.el,
        );
    };
    render();
    return root;
}
