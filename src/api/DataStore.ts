/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { gmGet, gmOnRemoteChange, gmSet } from "@utils/gm";
import { isObject } from "@utils/guards";

import { type DataChangeSource, type DataStoreName, dispatch } from "./Events";
import { type DeArrowState, mergeDeArrowState, normalizeDeArrowMap, normalizeQAList, normalizeSummaryList, type QARecord, type SummaryRecord } from "./records";

const SAVE_DELAY_MS = 250;

export class RecordStore<T> {
    private cache: Record<string, T> | null = null;
    private timer: ReturnType<typeof setTimeout> | null = null;
    /** Ids changed here since the last flush; only these are written over what other tabs stored. */
    private readonly dirty = new Set<string>();
    private replacing = false;

    /**
     * `merge`, when given, settles an entry both this tab and storage hold. It must pick the same winner whatever
     * the argument order, so tabs that hear each other's writes out of order still end up showing the same value.
     */
    constructor(readonly name: DataStoreName, readonly key: string, private readonly normalize: (raw: unknown) => Record<string, T>, private readonly merge?: (local: T, stored: T) => T) {}

    private load(): Record<string, T> {
        this.cache ??= this.normalize(gmGet(this.key, {}));
        return this.cache;
    }

    private settle(local: T | undefined, stored: T | undefined, pending: boolean): T | undefined {
        if (local === undefined) return pending ? undefined : stored;
        if (stored === undefined) return pending ? local : undefined;
        if (this.merge) return this.merge(local, stored);
        return pending ? local : stored;
    }

    /** Folds what another tab stored into this tab's copy, keeping the changes this tab has not flushed yet. */
    private absorb(stored: Record<string, T>): string[] {
        const prev = this.load();
        if (this.replacing) return [];
        const next: Record<string, T> = {};
        const changed: string[] = [];
        for (const id of new Set([...Object.keys(prev), ...Object.keys(stored)])) {
            const value = this.settle(prev[id], stored[id], this.dirty.has(id));
            if (value !== undefined) next[id] = value;
            if (JSON.stringify(value) !== JSON.stringify(prev[id])) changed.push(id);
        }
        this.cache = next;
        return changed;
    }

    watchRemote() {
        gmOnRemoteChange(this.key, value => {
            const ids = this.absorb(this.normalize(value));
            if (ids.length) dispatch("dataChange", { store: this.name, ids, source: "remote" });
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
            this.dirty.add(id);
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
        this.replacing = true;
        this.schedule();
        dispatch("dataChange", { store: this.name, ids, source });
    }

    flush() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = null;
        if (!this.cache) return;
        if (this.replacing) {
            this.replacing = false;
            this.dirty.clear();
            gmSet(this.key, this.cache);
            return;
        }
        if (!this.dirty.size) return;
        // Write only this tab's changes over what is stored now: writing the whole copy would put back
        // entries another tab has changed since, and the tabs would keep overwriting each other.
        const ids = this.absorb(this.normalize(gmGet(this.key, {})));
        this.dirty.clear();
        gmSet(this.key, this.cache);
        if (ids.length) dispatch("dataChange", { store: this.name, ids, source: "remote" });
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
export const DeArrowStates = new RecordStore<DeArrowState>("dearrow", "LDPP.dearrow", normalizeDeArrowMap, (local, stored) => mergeDeArrowState(local, stored) ?? local);

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
