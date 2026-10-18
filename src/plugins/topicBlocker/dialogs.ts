/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openDialog } from "@api/Dialog";
import { showToast } from "@api/Notifications";
import { displayedTitle, type TopicRow } from "@api/TopicList";
import { autoGrow, Button, InfoTip } from "@components/controls";
import { BanIcon, CloseIcon, PlusIcon } from "@components/icons";
import { h } from "@utils/dom";
import { normalizeText } from "@utils/text";

import { type BlockReason, type BlockRules, REASON_LABEL, withAdditions, withoutReasons } from "./rules";

export interface RulesAccess {
    get(): BlockRules;
    set(next: BlockRules): void;
}

function checkbox(label: string, checked: boolean, onChange: (value: boolean) => void): HTMLLabelElement {
    const input = h("input", { type: "checkbox", checked });
    input.addEventListener("change", () => onChange(input.checked));
    return h("label", { class: "ldpp-check" }, input, h("span", null, label));
}

export interface BlockSelection {
    keywords: string[];
    categories: string[];
    tags: string[];
}

export interface BlockPickerOptions {
    dialogTitle: string;
    /** The original (not rewritten) title; text selected in it becomes a keyword. */
    title: string;
    category: string;
    tags: readonly string[];
    /** Where selected keywords go, e.g. 「标题关键词」 or 「「#trade」的屏蔽词」. */
    keywordTarget: string;
    titleNote?: string;
    info?: string;
    apply(selection: BlockSelection): void;
}

/** The 「屏蔽选择器」 shared by topic rows and search results: pick keywords from the title, the category and tags. */
export function openBlockPicker({ dialogTitle, title, category, tags: tagList, keywordTarget, titleNote, info, apply }: BlockPickerOptions) {
    const keywords: string[] = [];
    const categories = new Set<string>();
    const tags = new Set<string>();
    const titleBox = autoGrow(h("textarea", { class: "ldpp-input ldpp-title-source", readOnly: true, rows: 2, value: title }));
    const chips = h("div", { class: "ldpp-chips" });
    const preview = h("p", { class: "ldpp-block-preview" });
    const addSelection = Button("添加选中文字", { icon: PlusIcon(), small: true, disabled: true });

    const renderChips = () => {
        chips.replaceChildren(...keywords.map(keyword => h("span", { class: "ldpp-chip" }, keyword, h("button", {
            type: "button",
            class: "ldpp-chip-remove",
            title: "移除",
            on: { click: () => { keywords.splice(keywords.indexOf(keyword), 1); renderChips(); } },
        }, CloseIcon(12)))));
        const parts = [
            keywords.length ? `${keywordTarget}：${keywords.join("、")}` : "",
            categories.size ? `类别：${Array.from(categories).join("、")}` : "",
            tags.size ? `标签：${Array.from(tags).join("、")}` : "",
        ].filter(Boolean);
        preview.textContent = parts.length ? `将添加 → ${parts.join("；")}` : `未选择任何项时，将把整个标题「${title}」加入${keywordTarget}。`;
    };
    const selectionText = () => normalizeText(titleBox.value.slice(titleBox.selectionStart ?? 0, titleBox.selectionEnd ?? 0));
    const syncSelection = () => { addSelection.disabled = !selectionText(); };
    for (const type of ["select", "keyup", "mouseup"] as const) titleBox.addEventListener(type, syncSelection);
    addSelection.addEventListener("click", () => {
        const text = selectionText();
        if (text && !keywords.some(keyword => keyword.toLowerCase() === text.toLowerCase())) keywords.push(text);
        titleBox.setSelectionRange(0, 0);
        syncSelection();
        renderChips();
    });
    const toggle = (set: Set<string>, value: string) => (on: boolean) => {
        if (on) set.add(value);
        else set.delete(value);
        renderChips();
    };

    const body = h("div", { class: "ldpp-block-dialog" },
        h("div", { class: "ldpp-block-field" },
            h("span", { class: "ldpp-field-label" }, "原标题", titleNote ? InfoTip(titleNote) : null),
            titleBox,
            h("div", { class: "ldpp-row-actions" }, addSelection, InfoTip("先在上方的原标题里选中一段文字，再点「添加选中文字」把它作为关键词。")),
            chips,
        ),
        category ? h("div", { class: "ldpp-block-field" }, h("span", { class: "ldpp-field-label" }, "类别"), checkbox(category, false, toggle(categories, category))) : null,
        tagList.length ? h("div", { class: "ldpp-block-field" }, h("span", { class: "ldpp-field-label" }, "标签"), h("div", { class: "ldpp-check-group" }, tagList.map(tag => checkbox(tag, false, toggle(tags, tag))))) : null,
        preview,
    );
    renderChips();
    openDialog({
        title: dialogTitle,
        icon: BanIcon(18),
        danger: true,
        info,
        body,
        size: "medium",
        actions: [
            { label: "取消" },
            {
                label: "屏蔽",
                kind: "danger",
                onClick: () => {
                    const picked = keywords.length || categories.size || tags.size;
                    apply({ keywords: picked ? [...keywords] : [title], categories: Array.from(categories), tags: Array.from(tags) });
                },
            },
        ],
    });
}

export function openBlockDialog(row: TopicRow, rules: RulesAccess) {
    openBlockPicker({
        dialogTitle: "屏蔽此话题",
        title: row.originalTitle,
        category: row.category,
        tags: row.tags,
        keywordTarget: "标题关键词",
        titleNote: displayedTitle(row) !== row.originalTitle ? "列表当前显示的是 DeArrow 改写后的标题；屏蔽规则始终匹配原标题。" : undefined,
        apply: ({ keywords, categories, tags }) => {
            rules.set(withAdditions(rules.get(), { titleKeywords: keywords, categories, tags }));
            showToast("已添加屏蔽规则", "success");
        },
    });
}

export function openUnblockDialog(row: TopicRow, reasons: BlockReason[], rules: RulesAccess) {
    const selected = new Set(reasons);
    const list = h("ul", { class: "ldpp-reason-list" }, reasons.map(reason => {
        const input = h("input", { type: "checkbox", checked: true });
        input.addEventListener("change", () => {
            if (input.checked) selected.add(reason);
            else selected.delete(reason);
        });
        return h("li", null, h("label", { class: "ldpp-check" }, input,
            h("span", { class: "ldpp-reason-kind" }, REASON_LABEL[reason.kind]),
            h("code", { class: "ldpp-reason-rule" }, reason.rule),
            reason.note ? h("span", { class: "ldpp-muted" }, `（${reason.note}）`) : null,
        ));
    }));
    openDialog({
        title: "屏蔽原因",
        icon: BanIcon(18),
        danger: true,
        info: "勾选要删除的规则。删除后所有命中这些规则的话题都会恢复显示。",
        size: "medium",
        body: h("div", { class: "ldpp-block-dialog" },
            h("p", { class: "ldpp-block-title" }, row.originalTitle),
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
                    rules.set(withoutReasons(rules.get(), Array.from(selected)));
                    showToast(`已删除 ${selected.size} 条屏蔽规则`, "success");
                },
            },
        ],
    });
}
