/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DeArrowStates, Questions, Summaries, Summarized } from "@api/DataStore";
import { type DeArrowState, mergeDeArrowMaps, mergeQA, mergeSummaries, normalizeDeArrowMap, normalizeQAList, normalizeSummaryList, type QARecord, type SummaryRecord } from "@api/records";
import { gmGet, gmSet } from "@utils/gm";
import { isObject } from "@utils/guards";

import { type DriveClient, DriveError } from "./client";

export const INDEX_FILE = "summary-index.v2.json";
export const DEARROW_FILE = "dearrow-state.v1.json";
export const LEGACY_FILE = "总结内容 - [LINUX DO] 🌟 主题 & 回复 总结.json";
export const TOPICS_FOLDER = "topics";
const SHARD_VERSION = 3;
const DEARROW_VERSION = 1;
const SHARD_NAME = /^topic-(.+)\.json$/;
const DIRTY_KEY = "LDPP.driveDirty";
const DEARROW_DIRTY_KEY = "LDPP.driveDeArrowDirty";

export interface IndexEntry {
    fileName: string;
    fileId: string;
    updatedAt: string;
    entryCount: number;
    questionCount: number;
    latestTimestamp: string;
    latestQuestionTimestamp: string;
}

export interface DriveIndex {
    version: number;
    updatedAt: string;
    topics: Record<string, IndexEntry>;
}

export interface ShardPayload {
    history: SummaryRecord[];
    questionHistory: QARecord[];
}

export const shardName = (topicId: string) => `topic-${topicId}.json`;

const parse = (text: string | null): unknown => {
    if (!text?.trim()) return null;
    try { return JSON.parse(text); } catch { throw new DriveError("Drive 中的文件不是有效 JSON"); }
};

export function normalizeIndex(raw: unknown): DriveIndex {
    const index: DriveIndex = { version: SHARD_VERSION, updatedAt: new Date().toISOString(), topics: {} };
    if (!isObject(raw) || !isObject(raw.topics)) return index;
    for (const [id, value] of Object.entries(raw.topics)) {
        if (!isObject(value) || !id.trim()) continue;
        index.topics[id.trim()] = {
            fileName: typeof value.fileName === "string" && value.fileName ? value.fileName : shardName(id.trim()),
            fileId: typeof value.fileId === "string" ? value.fileId : "",
            updatedAt: String(value.updatedAt ?? ""),
            entryCount: Number(value.entryCount ?? value.itemCount) || 0,
            questionCount: Number(value.questionCount) || 0,
            latestTimestamp: String(value.latestTimestamp ?? ""),
            latestQuestionTimestamp: String(value.latestQuestionTimestamp ?? ""),
        };
    }
    return index;
}

export function parseShard(raw: unknown): ShardPayload {
    if (Array.isArray(raw)) return { history: normalizeSummaryList(raw), questionHistory: [] };
    if (!isObject(raw)) return { history: [], questionHistory: [] };
    return { history: normalizeSummaryList(raw.history ?? raw.items), questionHistory: normalizeQAList(raw.questionHistory) };
}

export function parseDeArrowPayload(raw: unknown): Record<string, DeArrowState> {
    if (!isObject(raw)) throw new DriveError("Drive 中的 DeArrow 状态文件格式不对，已停止覆盖");
    const version = Number(raw.version);
    if (!Number.isInteger(version) || version < 1) throw new DriveError("Drive 中的 DeArrow 状态缺少版本号，已停止覆盖");
    if (version > DEARROW_VERSION) throw new DriveError(`Drive 中的 DeArrow 状态版本 ${version} 比当前支持的更新，已停止覆盖`);
    return normalizeDeArrowMap(raw.topics ?? raw.states);
}

export function indexEntry(topicId: string, payload: ShardPayload, fileId: string): IndexEntry {
    return {
        fileName: shardName(topicId),
        fileId,
        updatedAt: new Date().toISOString(),
        entryCount: payload.history.length,
        questionCount: payload.questionHistory.length,
        latestTimestamp: payload.history[0]?.timestamp ?? "",
        latestQuestionTimestamp: payload.questionHistory[0]?.timestamp ?? "",
    };
}

export function loadDirty(): Set<string> {
    const raw = gmGet<unknown>(DIRTY_KEY, []);
    return new Set(Array.isArray(raw) ? raw.map(String) : []);
}

export function saveDirty(dirty: Set<string>) {
    gmSet(DIRTY_KEY, Array.from(dirty));
}

export function loadDeArrowDirty(): boolean {
    return gmGet<boolean>(DEARROW_DIRTY_KEY, false) === true;
}

export function saveDeArrowDirty(value: boolean) {
    gmSet(DEARROW_DIRTY_KEY, value);
}

export class DriveSync {
    private root: string | null = null;
    private topics: string | null = null;

    constructor(private readonly client: DriveClient, private readonly folderName: string) {}

    async rootFolder(create: boolean): Promise<string | null> {
        if (this.root) return this.root;
        this.root = create ? await this.client.ensureFolder(this.folderName, null) : await this.client.findOne(this.folderName, null, true);
        return this.root;
    }

    private async topicsFolder(create: boolean): Promise<string | null> {
        if (this.topics) return this.topics;
        const root = await this.rootFolder(create);
        if (!root) return null;
        this.topics = create ? await this.client.ensureFolder(TOPICS_FOLDER, root) : await this.client.findOne(TOPICS_FOLDER, root, true);
        return this.topics;
    }

    private async loadIndex(): Promise<{ index: DriveIndex; fileId: string | null; readable: boolean }> {
        const root = await this.rootFolder(false);
        if (!root) return { index: normalizeIndex(null), fileId: null, readable: true };
        const fileId = await this.client.findOne(INDEX_FILE, root, false);
        const raw = fileId ? parse(await this.client.download(fileId)) : null;
        return { index: normalizeIndex(raw), fileId, readable: !fileId || (isObject(raw) && isObject(raw.topics)) };
    }

    private async readShard(topicId: string, entry: IndexEntry | undefined): Promise<{ payload: ShardPayload; fileId: string | null }> {
        const folder = await this.topicsFolder(false);
        let fileId = entry?.fileId || null;
        let text = fileId ? await this.client.download(fileId) : null;
        if (text === null && folder) {
            fileId = await this.client.findOne(entry?.fileName || shardName(topicId), folder, false);
            text = fileId ? await this.client.download(fileId) : null;
        }
        return { payload: parseShard(parse(text)), fileId: text === null ? null : fileId };
    }

    private async readLegacy(): Promise<Record<string, SummaryRecord[]>> {
        const root = await this.rootFolder(false);
        if (!root) return {};
        const fileId = await this.client.findOne(LEGACY_FILE, root, false);
        const raw = fileId ? parse(await this.client.download(fileId)) : null;
        const out: Record<string, SummaryRecord[]> = {};
        if (!isObject(raw)) return out;
        for (const [id, list] of Object.entries(raw)) {
            const items = normalizeSummaryList(list);
            if (items.length) out[id] = items;
        }
        return out;
    }

    async pullTopic(topicId: string): Promise<boolean> {
        const { index } = await this.loadIndex();
        let { payload } = await this.readShard(topicId, index.topics[topicId]);
        if (!payload.history.length) {
            const legacy = (await this.readLegacy())[topicId] ?? [];
            payload = { history: legacy, questionHistory: payload.questionHistory };
        }
        this.mergeIntoLocal(topicId, payload);
        return payload.history.length > 0;
    }

    async pullQuestions(topicId: string): Promise<void> {
        const { index } = await this.loadIndex();
        if (!index.topics[topicId]) return;
        const { payload } = await this.readShard(topicId, index.topics[topicId]);
        if (payload.questionHistory.length) this.mergeIntoLocal(topicId, { history: [], questionHistory: payload.questionHistory });
    }

    private mergeIntoLocal(topicId: string, payload: ShardPayload) {
        if (payload.history.length) {
            const local = Summaries.get(topicId) ?? [];
            const merged = mergeSummaries(local, payload.history);
            if (merged.length !== local.length) Summaries.set(topicId, merged, "drive");
            if (!Summarized.has(topicId)) Summarized.set(topicId, true, "drive");
        }
        if (payload.questionHistory.length) {
            const local = Questions.get(topicId) ?? [];
            const merged = mergeQA(local, payload.questionHistory);
            if (merged.length !== local.length) Questions.set(topicId, merged, "drive");
        }
    }

    async pullDeArrow(): Promise<number> {
        const root = await this.rootFolder(false);
        if (!root) return 0;
        const fileId = await this.client.findOne(DEARROW_FILE, root, false);
        const text = fileId ? await this.client.download(fileId) : null;
        if (!text?.trim()) return 0;
        const remote = parseDeArrowPayload(parse(text));
        return this.applyDeArrow(remote);
    }

    private applyDeArrow(remote: Record<string, DeArrowState>): number {
        const local = DeArrowStates.all() as Record<string, DeArrowState>;
        const merged = mergeDeArrowMaps(local, remote);
        const changed: Record<string, DeArrowState> = {};
        for (const [id, state] of Object.entries(merged)) if (JSON.stringify(local[id]) !== JSON.stringify(state)) changed[id] = state;
        DeArrowStates.setMany(changed, "drive");
        return Object.keys(changed).length;
    }

    async pushDeArrow(): Promise<number> {
        const root = await this.rootFolder(true);
        if (!root) return 0;
        const fileId = await this.client.findOne(DEARROW_FILE, root, false);
        const text = fileId ? await this.client.download(fileId) : null;
        if (fileId && text !== null && !text.trim()) throw new DriveError("Drive 中的 DeArrow 状态文件为空，已停止覆盖");
        const remote = text?.trim() ? parseDeArrowPayload(parse(text)) : {};
        const merged = mergeDeArrowMaps(DeArrowStates.all() as Record<string, DeArrowState>, remote);
        await this.client.upload(DEARROW_FILE, root, JSON.stringify({ version: DEARROW_VERSION, updatedAt: new Date().toISOString(), topics: merged }, null, 2), fileId);
        this.applyDeArrow(merged);
        return Object.keys(merged).length;
    }

    async pushTopics(topicIds: string[], onProgress?: (done: number, total: number) => void): Promise<string[]> {
        if (!topicIds.length) return [];
        const root = await this.rootFolder(true);
        const folder = await this.topicsFolder(true);
        if (!root || !folder) throw new DriveError("无法创建 Drive 同步文件夹");
        const { index, fileId: indexId, readable } = await this.loadIndex();
        if (!readable) throw new DriveError(`Drive 中的 ${INDEX_FILE} 为空或格式无法识别，已停止覆盖`);
        const done: string[] = [];
        let legacy: Record<string, SummaryRecord[]> | null = null;
        for (const topicId of topicIds) {
            const remote = await this.readShard(topicId, index.topics[topicId]);
            const remoteHistory = remote.payload.history.length ? remote.payload.history : (legacy ??= await this.readLegacy())[topicId] ?? [];
            const payload: ShardPayload = {
                history: mergeSummaries(remoteHistory, Summaries.get(topicId) ?? []),
                questionHistory: mergeQA(remote.payload.questionHistory, Questions.get(topicId) ?? []),
            };
            if (!payload.history.length && !payload.questionHistory.length) {
                done.push(topicId);
                continue;
            }
            const body = JSON.stringify({ version: SHARD_VERSION, topicId, updatedAt: new Date().toISOString(), ...payload }, null, 2);
            const fileId = await this.client.upload(shardName(topicId), folder, body, remote.fileId);
            index.topics[topicId] = indexEntry(topicId, payload, fileId);
            this.mergeIntoLocal(topicId, payload);
            done.push(topicId);
            onProgress?.(done.length, topicIds.length);
        }
        index.version = SHARD_VERSION;
        index.updatedAt = new Date().toISOString();
        await this.client.upload(INDEX_FILE, root, JSON.stringify(index, null, 2), indexId);
        return done;
    }

    async remoteTopicIds(): Promise<string[]> {
        const ids = new Set<string>();
        const { index } = await this.loadIndex();
        for (const [id, entry] of Object.entries(index.topics)) if (entry.entryCount > 0) ids.add(id);
        const folder = await this.topicsFolder(false);
        if (folder) for (const file of await this.client.children(folder)) {
            const id = file.name.match(SHARD_NAME)?.[1];
            if (id) ids.add(id);
        }
        for (const id of Object.keys(await this.readLegacy())) ids.add(id);
        return Array.from(ids);
    }
}
