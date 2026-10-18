/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { gmGet, gmOnRemoteChange, gmSet } from "@utils/gm";
import { isObject } from "@utils/guards";

import { type DataChangeSource, type DataStoreName, dispatch } from "./Events";
import { type DeArrowState, normalizeDeArrowMap, normalizeQAList, normalizeSummaryList, type QARecord, type SummaryRecord } from "./records";

const SAVE_DELAY_MS = 250;

export class RecordStore<T> {
    private cache: Record<string, T> | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;

    constructor(readonly name: DataStoreName, readonly key: string, private readonly normalize: (raw: unknown) => Record<string, T>) {}

    private load(): Record<string, T> {
        this.cache ??= this.normalize(gmGet(this.key, {}));
        return this.cache;
    }

    watchRemote() {
        gmOnRemoteChange(this.key, value => {
            const prev = this.load();
            this.cache = this.normalize(value);
            const ids = new Set([...Object.keys(prev), ...Object.keys(this.cache)]);
            dispatch("dataChange", { store: this.name, ids: Array.from(ids), source: "remote" });
        });
    }

    all(): Readonly<Record<string, T>> {
        return this.load();
    }

    get(id: string): T | undefined {
        return this.load()[id];
    }

    has(id: string): boolean {
        return id in this.load();
    }

    get size(): number {
        return Object.keys(this.load()).length;
    }

    setMany(entries: Record<string, T | undefined>, source: DataChangeSource = "local") {
        const data = this.load();
        const ids = Object.keys(entries);
        if (!ids.length) return;
        for (const id of ids) {
            const value = entries[id];
            if (value === undefined) delete data[id];
            else data[id] = value;
        }
        this.schedule();
        dispatch("dataChange", { store: this.name, ids, source });
    }

    set(id: string, value: T | undefined, source: DataChangeSource = "local") {
        this.setMany({ [id]: value }, source);
    }

    replaceAll(next: Record<string, T>, source: DataChangeSource) {
        const prev = this.load();
        const ids = Array.from(new Set([...Object.keys(prev), ...Object.keys(next)]));
        this.cache = { ...next };
        this.schedule();
        dispatch("dataChange", { store: this.name, ids, source });
    }

    flush() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        if (this.cache) gmSet(this.key, this.cache);
    }

    private schedule() {
        if (this.timer) return;
        this.timer = setTimeout(() => this.flush(), SAVE_DELAY_MS);
    }
}

function listMap<T>(normalizeList: (raw: unknown) => T[]) {
    return (raw: unknown) => {
        const out: Record<string, T[]> = {};
        if (!isObject(raw)) return out;
        for (const [id, list] of Object.entries(raw)) {
            const items = normalizeList(list);
            if (id.trim() && items.length) out[id.trim()] = items;
        }
        return out;
    };
}

function flagMap(raw: unknown): Record<string, true> {
    const out: Record<string, true> = {};
    const ids = Array.isArray(raw) ? raw : isObject(raw) ? Object.keys(raw) : [];
    for (const id of ids) if (String(id).trim()) out[String(id).trim()] = true;
    return out;
}

export const Summaries = new RecordStore<SummaryRecord[]>("summaries", "LDPP.summaries", listMap(normalizeSummaryList));
export const Questions = new RecordStore<QARecord[]>("questions", "LDPP.questions", listMap(normalizeQAList));
export const Summarized = new RecordStore<true>("summarized", "LDPP.summarized", flagMap);
export const DeArrowStates = new RecordStore<DeArrowState>("dearrow", "LDPP.dearrow", normalizeDeArrowMap);

export const ALL_STORES = [Summaries, Questions, Summarized, DeArrowStates];

export function initDataStores() {
    for (const store of ALL_STORES) store.watchRemote();
    window.addEventListener("pagehide", () => {
        for (const store of ALL_STORES) store.flush();
    });
}

export function hasSummary(topicId: string): boolean {
    return (Summaries.get(topicId)?.length ?? 0) > 0;
}

export function addSummary(topicId: string, record: SummaryRecord) {
    Summaries.set(topicId, [record, ...(Summaries.get(topicId) ?? [])]);
    if (!Summarized.has(topicId)) Summarized.set(topicId, true);
    dispatch("summaryUpdated", { topicId });
}

export function addQuestion(topicId: string, record: QARecord) {
    Questions.set(topicId, [record, ...(Questions.get(topicId) ?? [])]);
}
