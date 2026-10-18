/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ALL_STORES, DeArrowStates, Questions, Summaries, Summarized } from "@api/DataStore";
import { confirmDialog } from "@api/Dialog";
import { showToast } from "@api/Notifications";
import { isPluginEnabled, plugins, startPlugin, stopPlugin } from "@api/PluginManager";
import { mergeDeArrowMaps, mergeQA, mergeSummaries, normalizeDeArrowMap, normalizeQAList, normalizeSummaryList, type DeArrowState, type QARecord, type SummaryRecord } from "@api/records";
import { PlainSettings, type SettingsShape, SettingsStore } from "@api/Settings";
import { Button, Field, InfoTip, Section, Switch } from "@components/controls";
import { DatabaseIcon, TrashIcon } from "@components/icons";
import { h } from "@utils/dom";
import { isObject } from "@utils/guards";
import { downloadJson, errorMessage, isAbortError, pickJsonFile, todayStamp } from "@utils/misc";

import { convertLegacy, describeLegacy } from "./legacy";

export interface BackupData {
    summaries?: Record<string, SummaryRecord[]>;
    questions?: Record<string, QARecord[]>;
    summarized?: string[];
    dearrow?: Record<string, DeArrowState>;
}

export interface Backup {
    format: "ldpp-backup";
    version: 1;
    exportedAt: string;
    settings?: SettingsShape;
    settingsPatch?: Record<string, Record<string, unknown>>;
    data: BackupData;
}

const SECRET_PATHS: Array<[plugin: string, key: string]> = [["DriveSync", "clientSecret"], ["DriveSync", "refreshToken"]];

function stripSecrets(settings: SettingsShape): SettingsShape {
    const copy = structuredClone(settings);
    const profiles = copy.plugins.AI?.profiles;
    if (Array.isArray(profiles)) for (const profile of profiles) if (isObject(profile)) profile.key = "";
    for (const [plugin, key] of SECRET_PATHS) if (copy.plugins[plugin]?.[key]) copy.plugins[plugin][key] = "";
    return copy;
}

function keepLocalSecrets(next: SettingsShape) {
    const local = PlainSettings.plugins;
    const incoming = next.plugins.AI?.profiles;
    const known = Array.isArray(local.AI?.profiles) ? local.AI.profiles as Array<Record<string, unknown>> : [];
    if (Array.isArray(incoming)) {
        for (const profile of incoming) {
            if (!isObject(profile) || profile.key) continue;
            const match = known.find(item => item.id === profile.id);
            if (match?.key) profile.key = match.key;
        }
    }
    for (const [plugin, key] of SECRET_PATHS) {
        const target = next.plugins[plugin];
        if (target && !target[key] && local[plugin]?.[key]) target[key] = local[plugin][key];
    }
}

export function createBackup(includeSecrets: boolean): Backup {
    for (const store of ALL_STORES) store.flush();
    const settings = structuredClone(PlainSettings);
    return {
        format: "ldpp-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: includeSecrets ? settings : stripSecrets(settings),
        data: {
            summaries: structuredClone(Summaries.all()) as Record<string, SummaryRecord[]>,
            questions: structuredClone(Questions.all()) as Record<string, QARecord[]>,
            summarized: Object.keys(Summarized.all()),
            dearrow: structuredClone(DeArrowStates.all()) as Record<string, DeArrowState>,
        },
    };
}

function syncPluginStates() {
    for (const plugin of Object.values(plugins)) {
        const enabled = isPluginEnabled(plugin.name);
        if (enabled && !plugin.started) startPlugin(plugin);
        else if (!enabled && plugin.started) stopPlugin(plugin);
    }
}

function mergeListMap<T>(local: Readonly<Record<string, T[]>>, incoming: Record<string, unknown> | undefined, normalize: (raw: unknown) => T[], merge: (...lists: T[][]) => T[]): Record<string, T[]> {
    const out: Record<string, T[]> = {};
    for (const [id, raw] of Object.entries(incoming ?? {})) {
        const items = normalize(raw);
        if (items.length) out[id] = merge(local[id] ?? [], items);
    }
    return out;
}

export function applyBackup(backup: Backup): string[] {
    const notes: string[] = [];
    if (backup.settings) {
        const next = structuredClone(backup.settings);
        keepLocalSecrets(next);
        SettingsStore.replaceAll({ plugins: next.plugins ?? {} });
        notes.push("设置已替换");
    }
    if (backup.settingsPatch) {
        for (const [plugin, patch] of Object.entries(backup.settingsPatch)) {
            SettingsStore.store.plugins[plugin] = { ...PlainSettings.plugins[plugin], ...patch };
        }
        notes.push(`设置已合并（${Object.keys(backup.settingsPatch).length} 个模块）`);
    }
    syncPluginStates();
    const { data } = backup;
    const summaries = mergeListMap(Summaries.all(), data.summaries, normalizeSummaryList, mergeSummaries);
    if (Object.keys(summaries).length) {
        Summaries.setMany(summaries, "import");
        notes.push(`总结 ${Object.keys(summaries).length} 个话题`);
    }
    const questions = mergeListMap(Questions.all(), data.questions, normalizeQAList, mergeQA);
    if (Object.keys(questions).length) {
        Questions.setMany(questions, "import");
        notes.push(`问答 ${Object.keys(questions).length} 个话题`);
    }
    const flags = Object.fromEntries([...(data.summarized ?? []), ...Object.keys(summaries)].map(id => [String(id), true as const]));
    if (Object.keys(flags).length) {
        const added = Object.keys(flags).filter(id => !Summarized.has(id)).length;
        Summarized.setMany(flags, "import");
        if (added) notes.push(`「已总结」标记 ${added} 个话题`);
    }
    const dearrow = normalizeDeArrowMap(data.dearrow ?? {});
    if (Object.keys(dearrow).length) {
        const merged = mergeDeArrowMaps(DeArrowStates.all() as Record<string, DeArrowState>, dearrow);
        DeArrowStates.setMany(Object.fromEntries(Object.keys(dearrow).map(id => [id, merged[id]])), "import");
        notes.push(`DeArrow ${Object.keys(dearrow).length} 个话题`);
    }
    return notes;
}

function isBackup(raw: unknown): raw is Backup {
    return isObject(raw) && raw.format === "ldpp-backup" && isObject(raw.data);
}

async function importFile() {
    let raw: unknown;
    try {
        raw = await pickJsonFile();
    } catch (error) {
        if (!isAbortError(error)) showToast(errorMessage(error), "warning");
        return;
    }
    const backup = isBackup(raw) ? raw : convertLegacy(raw);
    if (!backup) {
        showToast("无法识别的文件：既不是 LD++ 备份，也不是旧版屏蔽 / 总结 / 关键词搜索脚本的导出文件", "error");
        return;
    }
    const kind = isBackup(raw) ? "LD++ 备份" : describeLegacy(raw);
    const replacesSettings = Boolean(backup.settings);
    const ok = await confirmDialog(h("div", null,
        h("p", null, `识别为：${kind}`),
        h("p", null, replacesSettings ? "导入会用文件中的设置替换当前设置（本地已有的 API Key 会保留），数据部分会与现有数据合并。" : "导入会把文件中的规则 / 配置合并进当前设置，数据部分会与现有数据合并。"),
    ), { title: "导入数据", icon: DatabaseIcon(18), okLabel: "导入" });
    if (!ok) return;
    try {
        const notes = applyBackup(backup);
        showToast(`导入完成：${notes.join("，") || "没有可导入的内容"}`, "success");
    } catch (error) {
        showToast(`导入失败：${errorMessage(error)}`, "error");
    }
}

const sizeOf = (value: unknown) => `${(JSON.stringify(value).length / 1024).toFixed(1)} KB`;

function stats(): HTMLElement {
    return h("ul", { class: "ldpp-stats" },
        h("li", null, `总结：${Summaries.size} 个话题（${sizeOf(Summaries.all())}）`),
        h("li", null, `问答：${Questions.size} 个话题（${sizeOf(Questions.all())}）`),
        h("li", null, `已总结标记：${Summarized.size} 个话题`),
        h("li", null, `DeArrow 状态：${DeArrowStates.size} 个话题（${sizeOf(DeArrowStates.all())}）`),
        h("li", null, `设置：${sizeOf(PlainSettings)}`),
    );
}

export function renderDataPanel(): HTMLElement {
    let includeSecrets = false;
    const statBox = h("div", null, stats());
    const clearButton = (label: string, store: typeof ALL_STORES[number]) => Button(`清空${label}`, {
        kind: "delete",
        icon: TrashIcon(),
        small: true,
        onClick: async () => {
            if (!await confirmDialog(`确定清空全部${label}吗？此操作不可撤销（已同步到 Drive 的副本不受影响）。`, { title: `清空${label}`, danger: true, okLabel: "清空" })) return;
            store.replaceAll({}, "local");
            statBox.replaceChildren(stats());
            showToast(`已清空${label}`, "success");
        },
    });
    return h("div", { class: "ldpp-data-panel" },
        Section("导出",
            Field("包含 API Key 与 Drive 凭据", Switch(false, value => { includeSecrets = value; }), "关闭时导出的文件不含任何密钥，可放心分享。"),
            h("div", { class: "ldpp-row-actions" }, Button("导出 LD++ 备份", { kind: "primary", onClick: () => {
                downloadJson(createBackup(includeSecrets), `LDPP-备份_${todayStamp()}.json`);
                showToast("备份已导出", "success");
            } })),
        ),
        Section(["导入", InfoTip("支持：LD++ 备份；旧版「LINUX DO 屏蔽脚本」导出的配置；旧版「话题 & 回复 总结」导出的「脚本配置」「总结内容」「全部数据」。数据按话题合并，不会覆盖已有记录。")],
            h("div", { class: "ldpp-row-actions" }, Button("选择文件导入…", { onClick: () => importFile().then(() => statBox.replaceChildren(stats())) })),
        ),
        Section("本地存储", statBox, h("div", { class: "ldpp-row-actions" }, clearButton("总结", Summaries), clearButton("问答", Questions), clearButton("DeArrow 状态", DeArrowStates))),
    );
}
