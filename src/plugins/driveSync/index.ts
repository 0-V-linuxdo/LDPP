/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Summarized } from "@api/DataStore";
import { subscribe } from "@api/Events";
import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button, InfoTip } from "@components/controls";
import { CloudIcon } from "@components/icons";
import { h } from "@utils/dom";
import { Logger } from "@utils/Logger";
import { errorMessage } from "@utils/misc";
import definePlugin, { OptionType } from "@utils/types";

import { registerQuestionSource } from "../topicQA";
import { registerRemoteSource } from "../topicSummary/engine";
import { DriveClient } from "./client";
import { DriveSync, loadDeArrowDirty, loadDirty, saveDeArrowDirty, saveDirty } from "./sync";

const logger = new Logger("DriveSync", "#89b4fa");
const DEFAULT_FOLDER = "[LINUX DO] 🌟 话题 & 回复 总结";
const AUTO_DELAY_MS = 3000;

export const settings = definePluginSettings({
    clientId: {
        type: OptionType.STRING,
        description: "OAuth Client ID",
        placeholder: "xxxx.apps.googleusercontent.com",
        default: "",
    },
    clientSecret: {
        type: OptionType.STRING,
        description: "OAuth Client Secret",
        secret: true,
        default: "",
    },
    refreshToken: {
        type: OptionType.STRING,
        description: "Refresh Token",
        secret: true,
        default: "",
    },
    folderName: {
        type: OptionType.STRING,
        description: "Drive 同步文件夹名称",
        default: DEFAULT_FOLDER,
    },
    autoSync: {
        type: OptionType.BOOLEAN,
        description: "本地总结 / 问答 / DeArrow 状态变化后自动上传。",
        default: true,
    },
    panel: {
        type: OptionType.COMPONENT,
        description: "同步操作",
        render: () => renderPanel(),
    },
});

let dirty = new Set<string>();
let dearrowDirty = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<void> | null = null;
let queued = false;
let status = "尚未同步";
let cached: { key: string; client: DriveClient } | null = null;
const statusListeners = new Set<() => void>();
const unsubs: Array<() => void> = [];

function client(): DriveClient {
    const { clientId, clientSecret, refreshToken } = settings.store;
    const key = `${clientId}\u0000${clientSecret}\u0000${refreshToken}`;
    if (cached?.key !== key) cached = { key, client: new DriveClient({ clientId, clientSecret, refreshToken }) };
    return cached.client;
}

function engine(): DriveSync {
    return new DriveSync(client(), settings.store.folderName.trim() || DEFAULT_FOLDER);
}

function setStatus(text: string) {
    status = text;
    for (const listener of Array.from(statusListeners)) listener();
}

function pendingText(): string {
    const parts = [dirty.size ? `${dirty.size} 个话题` : "", dearrowDirty ? "DeArrow 状态" : ""].filter(Boolean);
    return parts.length ? `待上传：${parts.join(" + ")}` : "没有待上传的变更";
}

async function runSync(manual: boolean) {
    if (!client().configured) {
        setStatus("凭据未填写完整");
        if (manual) showToast("请先填写 Google Drive 凭据", "warning");
        return;
    }
    if (running) {
        queued = true;
        return running;
    }
    running = (async () => {
        const sync = engine();
        try {
            let dearrowCount = 0;
            if (dearrowDirty) {
                setStatus("正在同步 DeArrow 状态…");
                dearrowDirty = false;
                saveDeArrowDirty(false);
                dearrowCount = await sync.pushDeArrow();
            }
            const ids = Array.from(dirty);
            if (ids.length) {
                const done = await sync.pushTopics(ids, (count, total) => setStatus(`正在上传话题 ${count}/${total}…`));
                for (const id of done) dirty.delete(id);
                saveDirty(dirty);
            }
            setStatus(`${new Date().toLocaleTimeString()} 同步完成：话题 ${ids.length} 个${dearrowCount ? `，DeArrow ${dearrowCount} 条` : ""}`);
            if (manual) showToast("Google Drive 同步完成", "success");
        } catch (error) {
            logger.error("同步失败", error);
            setStatus(`同步失败：${errorMessage(error)}`);
            if (manual) showToast(`Drive 同步失败：${errorMessage(error)}`, "error");
            else showToast(`Drive 自动同步失败：${errorMessage(error)}`, "error", { key: "drive-sync" });
        }
    })().finally(() => {
        running = null;
        if (queued) {
            queued = false;
            scheduleSync();
        }
    });
    return running;
}

function scheduleSync() {
    if (!settings.store.autoSync || !client().configured || (!dirty.size && !dearrowDirty)) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        void runSync(false);
    }, AUTO_DELAY_MS);
}

async function rebuildSummarized() {
    setStatus("正在从 Drive 读取已总结话题…");
    try {
        const ids = await engine().remoteTopicIds();
        Summarized.setMany(Object.fromEntries(ids.map(id => [id, true as const])), "drive");
        setStatus(`已标记 ${ids.length} 个云端已总结话题`);
        showToast(`已从 Drive 标记 ${ids.length} 个已总结话题`, "success");
    } catch (error) {
        setStatus(`重建失败：${errorMessage(error)}`);
        showToast(`重建失败：${errorMessage(error)}`, "error");
    }
}

async function testConnection() {
    setStatus("正在测试连接…");
    try {
        const root = await engine().rootFolder(false);
        setStatus(root ? "连接成功，已找到同步文件夹" : "连接成功，Drive 中还没有同步文件夹（首次上传时自动创建）");
    } catch (error) {
        setStatus(`连接失败：${errorMessage(error)}`);
    }
}

function renderPanel(): HTMLElement {
    const line = h("p", { class: "ldpp-drive-status" });
    const pending = h("p", { class: "ldpp-muted" });
    const update = () => {
        line.textContent = status;
        pending.textContent = pendingText();
    };
    statusListeners.add(update);
    update();
    return h("div", { class: "ldpp-drive-panel" },
        h("div", { class: "ldpp-row-actions" },
            Button("立即同步", { kind: "primary", small: true, icon: CloudIcon(14), onClick: () => void runSync(true).then(update) }),
            Button("测试连接", { small: true, onClick: () => void testConnection() }),
            Button("从云端重建「已总结」标记", { small: true, onClick: () => void rebuildSummarized() }),
            InfoTip("需要在 Google Cloud 控制台为 Drive API 创建 OAuth 客户端，并用 drive.file（或 drive）权限换取 Refresh Token。文件夹布局与旧版总结脚本一致，可直接接续旧数据。"),
        ),
        line,
        pending,
    );
}

export default definePlugin({
    name: "DriveSync",
    displayName: "Google Drive 同步",
    description: "把总结、问答与 DeArrow 状态同步到你自己的 Google Drive，多设备共享；本地缺失时自动从云端拉取。",
    tags: ["sync"],
    icon: CloudIcon,
    settings,
    start() {
        dirty = loadDirty();
        dearrowDirty = loadDeArrowDirty();
        unsubs.push(
            subscribe("dataChange", ({ store, ids, source }) => {
                if (source !== "local" && source !== "import") return;
                if (store === "summaries" || store === "questions") {
                    for (const id of ids) dirty.add(id);
                    saveDirty(dirty);
                } else if (store === "dearrow") {
                    dearrowDirty = true;
                    saveDeArrowDirty(true);
                } else {
                    return;
                }
                statusListeners.forEach(listener => listener());
                scheduleSync();
            }),
            registerRemoteSource(async topicId => client().configured && engine().pullTopic(topicId)),
            registerQuestionSource(async topicId => {
                if (client().configured) await engine().pullQuestions(topicId);
            }),
        );
        if (client().configured) {
            engine().pullDeArrow().then(count => {
                if (count) logger.info(`从 Drive 合并了 ${count} 条 DeArrow 状态`);
            }, error => logger.warn("拉取 DeArrow 状态失败", error));
        }
        scheduleSync();
    },
    stop() {
        if (timer) clearTimeout(timer);
        timer = null;
        for (const unsub of unsubs.splice(0)) unsub();
    },
});
