/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type AIProfile, chat, configureAI, DEFAULT_PROFILE, describeError, normalizeProfile } from "@api/AI";
import { confirmDialog } from "@api/Dialog";
import { definePluginSettings } from "@api/Settings";
import { Button, Field, Hint, InfoTip, NumberInput, Section, Select, Switch, TextInput } from "@components/controls";
import { BotIcon, CopyIcon, PlusIcon, TrashIcon } from "@components/icons";
import { h } from "@utils/dom";
import { randomId } from "@utils/misc";
import definePlugin, { OptionType, StartAt } from "@utils/types";

const DEFAULT_ID = "default";

export const settings = definePluginSettings({
    profiles: {
        type: OptionType.CUSTOM,
        default: [{ ...DEFAULT_PROFILE, id: DEFAULT_ID }] as AIProfile[],
    },
    activeProfile: {
        type: OptionType.CUSTOM,
        default: DEFAULT_ID,
    },
});

export function listProfiles(): AIProfile[] {
    const raw = settings.store.profiles;
    const list = Array.isArray(raw) ? raw.map(normalizeProfile) : [];
    return list.length ? list : [{ ...DEFAULT_PROFILE, id: DEFAULT_ID }];
}

function saveProfiles(next: AIProfile[]) {
    settings.store.profiles = next.map(profile => ({ ...profile }));
}

export function profileChoices(): Array<{ label: string; value: string }> {
    return listProfiles().map(profile => ({ label: `${profile.name}（${profile.model}）`, value: profile.id }));
}

export function uniqueName(stem: string, list: AIProfile[]): string {
    const names = new Set(list.map(profile => profile.name));
    for (let index = 1; ; index++) {
        const name = index === 1 ? stem : `${stem} ${index}`;
        if (!names.has(name)) return name;
    }
}

export const copyName = (name: string, list: AIProfile[]) => uniqueName(`${name.replace(/\s*副本(?:\s*\d+)?$/, "")} 副本`, list);

async function testProfile(profile: AIProfile, output: HTMLElement) {
    output.replaceChildren(Hint("正在请求…"));
    const started = performance.now();
    try {
        const reply = await chat(profile, [{ role: "user", content: "请只回复：OK" }]);
        output.replaceChildren(Hint(`连接成功（${Math.round(performance.now() - started)}ms）：${reply.slice(0, 80)}`, "success"));
    } catch (error) {
        output.replaceChildren(Hint(h("pre", { class: "ldpp-pre" }, describeError(error)), "error"));
    }
}

export function renderProfileEditor(): HTMLElement {
    const root = h("div", { class: "ldpp-ai-editor" });
    let selected = settings.store.activeProfile;
    const render = () => {
        const list = listProfiles();
        const profile = list.find(item => item.id === selected) ?? list[0];
        selected = profile.id;
        const update = (patch: Partial<AIProfile>) => {
            saveProfiles(listProfiles().map(item => item.id === profile.id ? normalizeProfile({ ...item, ...patch }) : item));
            if ("name" in patch || "model" in patch) render();
        };
        const testOutput = h("div", { class: "ldpp-ai-test" });
        const imageBox = h("div", { class: "ldpp-ai-images", hidden: !profile.imageInput },
            Field("图片清晰度", Select(profile.imageDetail, [{ label: "auto", value: "auto" }, { label: "low", value: "low" }, { label: "high", value: "high" }], value => update({ imageDetail: value as AIProfile["imageDetail"] }))),
            Field("每次最多图片数", NumberInput({ value: profile.maxImages, min: 1, max: 20, onChange: value => update({ maxImages: value }) })),
            Field("单张上限", NumberInput({ value: profile.maxImageMB, min: 0.25, max: 20, step: 0.25, unit: "MB", onChange: value => update({ maxImageMB: value }) })),
            Field("总量上限", NumberInput({ value: profile.maxTotalImageMB, min: 0.25, max: 60, step: 0.25, unit: "MB", onChange: value => update({ maxTotalImageMB: value }) })),
        );
        root.replaceChildren(
            Section(["接口配置", InfoTip("总结、提问默认使用「默认」配置；DeArrow 可在其设置中分别选择判断与改写所用的配置。API Key 仅保存在本地脚本存储中。")],
                Field("当前编辑", Select(profile.id, list.map(item => ({ label: item.id === settings.store.activeProfile ? `${item.name}（默认）` : item.name, value: item.id })), value => {
                    selected = value;
                    render();
                })),
                h("div", { class: "ldpp-row-actions" },
                    Button("设为默认", { kind: "primary", small: true, disabled: profile.id === settings.store.activeProfile, onClick: () => { settings.store.activeProfile = profile.id; render(); } }),
                    Button("新建", { icon: PlusIcon(), small: true, onClick: () => {
                        const created = normalizeProfile({ ...DEFAULT_PROFILE, id: randomId("ai-"), name: uniqueName("新配置", list) });
                        saveProfiles([...list, created]);
                        selected = created.id;
                        render();
                    } }),
                    Button("复制", { icon: CopyIcon(), small: true, onClick: () => {
                        const copy = normalizeProfile({ ...profile, id: randomId("ai-"), name: copyName(profile.name, list) });
                        saveProfiles([...list, copy]);
                        selected = copy.id;
                        render();
                    } }),
                    Button("删除", { icon: TrashIcon(), kind: "delete", small: true, disabled: list.length <= 1, onClick: async () => {
                        if (!await confirmDialog(`确定删除 AI 配置「${profile.name}」吗？`, { title: "删除 AI 配置", danger: true, okLabel: "删除" })) return;
                        const rest = listProfiles().filter(item => item.id !== profile.id);
                        saveProfiles(rest);
                        if (settings.store.activeProfile === profile.id) settings.store.activeProfile = rest[0].id;
                        selected = settings.store.activeProfile;
                        render();
                    } }),
                ),
                Field("名称", TextInput({ value: profile.name, onChange: value => update({ name: value }) })),
                Field("接口地址", h("span", { class: "ldpp-field-wide" }, TextInput({ value: profile.url, placeholder: DEFAULT_PROFILE.url, onChange: value => update({ url: value }) })), "OpenAI 兼容的 Chat Completions 完整地址。"),
                Field("API Key", h("span", { class: "ldpp-field-wide" }, TextInput({ value: profile.key, secret: true, placeholder: "sk-...", onChange: value => update({ key: value }) }))),
                Field("模型", TextInput({ value: profile.model, onChange: value => update({ model: value }) })),
                Field("失败重试", h("span", { class: "ldpp-inline-controls" },
                    NumberInput({ value: profile.retryCount, min: 0, max: 10, unit: "次", onChange: value => update({ retryCount: value }) }),
                    h("span", { class: "ldpp-muted" }, "间隔"),
                    NumberInput({ value: profile.retryInterval, min: 1, max: 600, unit: "秒", onChange: value => update({ retryInterval: value }) }),
                )),
                Field("图片输入", Switch(profile.imageInput, value => {
                    update({ imageInput: value });
                    imageBox.hidden = !value;
                }, "图片输入"), "把话题里的站内图片一起发给支持视觉的模型。"),
                imageBox,
                h("div", { class: "ldpp-row-actions" }, Button("测试连接", { kind: "primary", small: true, onClick: () => testProfile(listProfiles().find(item => item.id === profile.id) ?? profile, testOutput) })),
                testOutput,
            ),
        );
    };
    render();
    return root;
}

export default definePlugin({
    name: "AI",
    displayName: "AI 接口",
    description: "管理 OpenAI 兼容接口配置，供总结、提问与 DeArrow 使用。",
    tags: ["core", "ai"],
    icon: BotIcon,
    required: true,
    hidden: true,
    startAt: StartAt.Init,
    settings,
    start() {
        configureAI({ list: listProfiles, activeId: () => settings.store.activeProfile });
    },
});
