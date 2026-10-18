/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { confirmDialog } from "@api/Dialog";
import { Button, Field, InfoTip, Select, SubTabs, TextInput } from "@components/controls";
import { CopyIcon, PlusIcon, RefreshIcon, TrashIcon } from "@components/icons";
import { h } from "@utils/dom";
import { randomId } from "@utils/misc";

import { DEFAULT_PROMPTS, type PromptConfig } from "./prompts";

export interface PromptStore {
    list(): PromptConfig[];
    save(next: PromptConfig[]): void;
    activeId(): string;
    setActive(id: string): void;
}

export function renderPromptEditor(store: PromptStore): HTMLElement {
    const root = h("div", { class: "ldpp-prompt-editor" });
    const render = () => {
        const list = store.list();
        const active = list.find(prompt => prompt.id === store.activeId()) ?? list[0];
        const update = (patch: Partial<PromptConfig>) => store.save(store.list().map(prompt => prompt.id === active.id ? { ...prompt, ...patch } : prompt));
        root.replaceChildren(
            Field("当前使用", Select(active.id, list.map(prompt => ({ label: prompt.name, value: prompt.id })), value => { store.setActive(value); render(); })),
            h("div", { class: "ldpp-row-actions" },
                Button("新建", { small: true, icon: PlusIcon(), onClick: () => {
                    const created = { ...DEFAULT_PROMPTS[0], id: randomId("prompt-"), name: "新提示词" };
                    store.save([...list, created]);
                    store.setActive(created.id);
                    render();
                } }),
                Button("复制", { small: true, icon: CopyIcon(), onClick: () => {
                    const copy = { ...active, id: randomId("prompt-"), name: `${active.name} 副本` };
                    store.save([...list, copy]);
                    store.setActive(copy.id);
                    render();
                } }),
                Button("删除", { small: true, kind: "delete", icon: TrashIcon(), disabled: list.length <= 1, onClick: async () => {
                    if (!await confirmDialog(`确定删除提示词「${active.name}」吗？`, { title: "删除提示词", danger: true, okLabel: "删除" })) return;
                    const rest = store.list().filter(prompt => prompt.id !== active.id);
                    store.save(rest);
                    store.setActive(rest[0].id);
                    render();
                } }),
                Button("恢复默认提示词", { small: true, icon: RefreshIcon(), onClick: async () => {
                    if (!await confirmDialog("恢复后自定义的提示词会被删除，确定吗？", { title: "恢复默认提示词", danger: true, icon: RefreshIcon(18), okLabel: "恢复" })) return;
                    store.save(structuredClone(DEFAULT_PROMPTS));
                    store.setActive(DEFAULT_PROMPTS[0].id);
                    render();
                } }),
                InfoTip("总结时会把话题标题、楼层数与全部楼层正文（#楼层 用户名：内容）作为用户消息发送。"),
            ),
            Field("名称", TextInput({ value: active.name, onChange: value => { update({ name: value.trim() || active.name }); render(); } })),
            // The two long prompts share one tabbed block instead of stacking (they measured 394 + 568 px together).
            SubTabs([
                { label: () => "总结方法（system 提示词）", render: () => TextInput({ value: active.system, multiline: true, rows: 4, onChange: value => update({ system: value }) }) },
                { label: () => "输出格式", render: () => h("div", null, h("p", { class: "ldpp-muted ldpp-settings-group-desc" }, "输出格式里写明 Markdown 或 HTML，LD++ 会按对应方式渲染（HTML 会经过安全过滤）。"), TextInput({ value: active.format, multiline: true, rows: 4, onChange: value => update({ format: value }) })) },
            ]).el,
        );
    };
    render();
    return root;
}
