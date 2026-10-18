/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { currentRoute } from "@api/Navigation";
import { definePluginSettings } from "@api/Settings";
import { isRevealHidden, registerDecorator, registerFilter, registerProcessor, schedule, setRevealHidden, type TopicRow, unregisterDecorator, unregisterFilter, unregisterProcessor } from "@api/TopicList";
import { IconButton } from "@components/controls";
import { BanIcon } from "@components/icons";
import { h, mark, setClass } from "@utils/dom";
import definePlugin, { OptionType } from "@utils/types";

import { openBlockDialog, openUnblockDialog, type RulesAccess } from "./dialogs";
import { type KeywordSort, renderRulesEditor, type SortPreference } from "./editor";
import { type BlockReason, type BlockRules, compileRules, type CompiledRules, EMPTY_RULES, evaluate, normalizeRules } from "./rules";

const FILTER_ID = "TopicBlocker";
const SUGGESTED = ".suggested-topics, #suggested-topics, .more-topics__container, .more-topics__lists";

export const keywordSortPreference: SortPreference = {
    get: (): KeywordSort => settings.store.keywordSort === "added" ? "added" : "pinyin",
    set: (value: KeywordSort) => { settings.store.keywordSort = value; },
};

export const settings = definePluginSettings({
    rules: {
        type: OptionType.CUSTOM,
        default: EMPTY_RULES as BlockRules,
    },
    editor: {
        type: OptionType.COMPONENT,
        description: "屏蔽规则",
        render: (): HTMLElement => renderRulesEditor(rulesAccess, keywordSortPreference),
    },
    keywordSort: {
        type: OptionType.CUSTOM,
        default: "pinyin" as KeywordSort,
    },
    showToggle: {
        type: OptionType.BOOLEAN,
        description: "在页面右侧显示悬浮的「已屏蔽 N」按钮，可随时临时显示被屏蔽的话题。",
        default: true,
    },
    showRowButton: {
        type: OptionType.BOOLEAN,
        description: "悬停话题时在行尾显示屏蔽按钮。",
        default: true,
    },
    includeSuggested: {
        type: OptionType.BOOLEAN,
        description: "同时屏蔽话题页底部「推荐话题」中的条目。",
        default: true,
    },
});

export const rulesAccess: RulesAccess = {
    get: () => normalizeRules(settings.store.rules),
    set: next => { settings.store.rules = normalizeRules(next); },
};

let compiled: CompiledRules | null = null;

function rules(): CompiledRules {
    compiled ??= compileRules(rulesAccess.get());
    return compiled;
}

export function reasonsFor(row: TopicRow): BlockReason[] {
    return (row.verdicts.get(FILTER_ID) as BlockReason[] | undefined) ?? [];
}

function renderButton(row: TopicRow, slot: HTMLElement) {
    if (!settings.store.showRowButton) {
        slot.replaceChildren();
        return;
    }
    const blocked = row.hidden && reasonsFor(row).length > 0;
    const existing = slot.firstElementChild as HTMLButtonElement | null;
    if (existing?.dataset.blocked === String(blocked)) return;
    const button = IconButton(BanIcon(15), {
        title: blocked ? "查看屏蔽原因" : "屏蔽此话题",
        className: blocked ? "ldpp-row-btn ldpp-block-btn is-blocked" : "ldpp-row-btn ldpp-block-btn ldpp-hover-only",
        onClick: event => {
            event.preventDefault();
            event.stopPropagation();
            const reasons = reasonsFor(row);
            if (reasons.length) openUnblockDialog(row, reasons, rulesAccess);
            else openBlockDialog(row, rulesAccess);
        },
    });
    button.dataset.blocked = String(blocked);
    slot.replaceChildren(button);
}

function renderToggle(rows: readonly TopicRow[]) {
    const existing = document.querySelector<HTMLElement>(".ldpp-blocked-float");
    const count = rows.filter(row => reasonsFor(row).length > 0).length;
    const revealing = isRevealHidden();
    if (!settings.store.showToggle || currentRoute().kind === "topic" || (!count && !revealing)) {
        existing?.remove();
        return;
    }
    const wrapper = existing ?? mark(h("div", { class: "ldpp-blocked-float" },
        h("button", {
            type: "button",
            class: "ldpp-float-pill ldpp-blocked-toggle",
            on: { click: () => { setRevealHidden(!isRevealHidden()); schedule(); } },
        }, BanIcon(18), h("span", { class: "ldpp-float-count ldpp-blocked-count" })),
    ), "blocked-toggle");
    if (!wrapper.isConnected) document.body.appendChild(wrapper);
    const button = wrapper.querySelector<HTMLButtonElement>(".ldpp-blocked-toggle");
    const counter = wrapper.querySelector<HTMLElement>(".ldpp-blocked-count");
    if (!button || !counter) return;
    setClass(button, "is-revealing", revealing);
    const tip = revealing ? `恢复隐藏被屏蔽的 ${count} 个话题` : `临时显示被屏蔽的 ${count} 个话题`;
    if (button.title !== tip) button.title = tip;
    if (button.getAttribute("aria-pressed") !== String(revealing)) button.setAttribute("aria-pressed", String(revealing));
    if (counter.textContent !== String(count)) counter.textContent = String(count);
}

export default definePlugin({
    name: "TopicBlocker",
    displayName: "话题屏蔽",
    description: "按标题关键词、类别、标签（支持正则）隐藏列表中的话题；可从话题行直接划词添加规则、查看原因并取消屏蔽。",
    tags: ["topics"],
    icon: BanIcon,
    enabledByDefault: true,
    settings,
    start() {
        compiled = null;
        registerFilter({
            id: FILTER_ID,
            test: row => {
                if (!settings.store.includeSuggested && row.el.closest(SUGGESTED)) return null;
                const reasons = evaluate(rules(), { title: row.originalTitle, category: row.category, tags: row.tags });
                return reasons.length ? reasons : null;
            },
        });
        registerDecorator({ id: "block", order: 10, render: renderButton });
        registerProcessor({ id: "blocked-toggle", run: renderToggle });
    },
    stop() {
        unregisterFilter(FILTER_ID);
        unregisterDecorator("block");
        unregisterProcessor("blocked-toggle");
        document.querySelector(".ldpp-blocked-float")?.remove();
        setRevealHidden(false);
    },
    onSettingsChange() {
        compiled = null;
        schedule();
    },
});
