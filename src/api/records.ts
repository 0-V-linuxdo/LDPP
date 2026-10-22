/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { asString, isObject } from "@utils/guards";
import { inferRenderMode, type RenderMode } from "@utils/markdown";
import { randomId } from "@utils/misc";

export interface SummaryRecord {
    summary: string;
    timestamp: string;
    model: string;
    renderMode: RenderMode;
}

export interface QARecord {
    id: string;
    question: string;
    answer: string;
    presetId: string;
    presetName: string;
    timestamp: string;
    model: string;
}

/** A typo fix: the fragment as the title has it, and what it should read. */
export interface TitleFix {
    from: string;
    to: string;
}

export interface DeArrowState {
    originalTitle: string;
    verdict?: boolean;
    verdictReason?: string;
    verdictModel?: string;
    verdictUpdatedAt?: string;
    rewrittenTitle?: string;
    rewriteModel?: string;
    rewrittenAt?: string;
    /** Set once the title was checked for typos; `fixes` is absent when none were found. */
    fixes?: TitleFix[];
    fixModel?: string;
    fixCheckedAt?: string;
    updatedAt: string;
}

const time = (value: string | undefined) => {
    const parsed = Date.parse(value ?? "");
    return Number.isFinite(parsed) ? parsed : 0;
};

export function isoOrEmpty(value: unknown): string {
    const parsed = Date.parse(asString(value));
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function latest(...values: Array<string | undefined>): string {
    return values.reduce<string>((best, value) => time(value) > time(best) ? value ?? "" : best, "");
}

const newestFirst = <T extends { timestamp: string }>(a: T, b: T) => time(b.timestamp) - time(a.timestamp);

export function normalizeSummary(raw: unknown): SummaryRecord | null {
    if (!isObject(raw)) return null;
    const summary = raw.summary == null ? "" : String(raw.summary);
    if (!summary.trim()) return null;
    const mode = asString(raw.renderMode).toLowerCase();
    return {
        summary,
        timestamp: isoOrEmpty(raw.timestamp) || new Date(0).toISOString(),
        model: asString(raw.model) || "未知模型",
        renderMode: mode.includes("html") ? "html" : mode.includes("markdown") ? "markdown" : inferRenderMode(summary, "html"),
    };
}

export function normalizeSummaryList(raw: unknown): SummaryRecord[] {
    return Array.isArray(raw) ? raw.map(normalizeSummary).filter((item): item is SummaryRecord => item !== null).toSorted(newestFirst) : [];
}

export function mergeSummaries(...lists: SummaryRecord[][]): SummaryRecord[] {
    const seen = new Map<string, SummaryRecord>();
    for (const item of lists.flat()) seen.set(`${item.timestamp}\u0000${item.model}\u0000${item.summary}`, item);
    return Array.from(seen.values()).toSorted(newestFirst);
}

export function normalizeQA(raw: unknown): QARecord | null {
    if (!isObject(raw)) return null;
    const question = raw.question == null ? "" : String(raw.question);
    const answer = raw.answer == null ? "" : String(raw.answer);
    if (!question.trim() && !answer.trim()) return null;
    return {
        id: asString(raw.id) || randomId("qa-"),
        question,
        answer,
        presetId: asString(raw.presetId),
        presetName: asString(raw.presetName),
        timestamp: isoOrEmpty(raw.timestamp) || new Date(0).toISOString(),
        model: asString(raw.model) || "未知模型",
    };
}

export function normalizeQAList(raw: unknown): QARecord[] {
    return Array.isArray(raw) ? raw.map(normalizeQA).filter((item): item is QARecord => item !== null).toSorted(newestFirst) : [];
}

export function mergeQA(...lists: QARecord[][]): QARecord[] {
    const seen = new Map<string, QARecord>();
    for (const item of lists.flat()) seen.set(item.id, item);
    return Array.from(seen.values()).toSorted(newestFirst);
}

function normalizeFixes(raw: unknown): TitleFix[] {
    if (!Array.isArray(raw)) return [];
    return raw.flatMap(item => {
        if (!isObject(item)) return [];
        const from = asString(item.from);
        const to = asString(item.to);
        return from && to && from !== to ? [{ from, to }] : [];
    });
}

export function normalizeDeArrow(raw: unknown): DeArrowState | null {
    if (!isObject(raw)) return null;
    const originalTitle = asString(raw.originalTitle);
    if (!originalTitle) return null;
    const state: DeArrowState = { originalTitle, updatedAt: "" };
    if (typeof raw.verdict === "boolean") {
        state.verdict = raw.verdict;
        state.verdictReason = asString(raw.verdictReason ?? raw.reason);
        state.verdictModel = asString(raw.verdictModel);
        state.verdictUpdatedAt = isoOrEmpty(raw.verdictUpdatedAt);
    }
    const rewritten = asString(raw.rewrittenTitle);
    if (rewritten) {
        state.rewrittenTitle = rewritten;
        state.rewriteModel = asString(raw.rewriteModel ?? raw.rewrittenModel);
        state.rewrittenAt = isoOrEmpty(raw.rewrittenAt);
    }
    const fixCheckedAt = isoOrEmpty(raw.fixCheckedAt);
    if (fixCheckedAt) {
        const fixes = normalizeFixes(raw.fixes);
        if (fixes.length) state.fixes = fixes;
        state.fixModel = asString(raw.fixModel);
        state.fixCheckedAt = fixCheckedAt;
    }
    state.updatedAt = latest(isoOrEmpty(raw.updatedAt), state.verdictUpdatedAt, state.rewrittenAt, state.fixCheckedAt);
    return state;
}

export function normalizeDeArrowMap(raw: unknown): Record<string, DeArrowState> {
    const out: Record<string, DeArrowState> = {};
    if (!isObject(raw)) return out;
    for (const [id, value] of Object.entries(raw)) {
        const state = normalizeDeArrow(value);
        if (asString(id) && state) out[asString(id)] = state;
    }
    return out;
}

/** The newer of two states by `at`; a tie goes the same way whichever comes first, so every tab and device settles on one. */
function newer(a: DeArrowState, b: DeArrowState, at: "updatedAt" | "verdictUpdatedAt" | "rewrittenAt" | "fixCheckedAt"): DeArrowState {
    const diff = time(b[at]) - time(a[at]);
    if (diff) return diff > 0 ? b : a;
    return JSON.stringify(b) > JSON.stringify(a) ? b : a;
}

function pickBundle(a: DeArrowState, b: DeArrowState, at: "verdictUpdatedAt" | "rewrittenAt" | "fixCheckedAt", present: (state: DeArrowState) => boolean): DeArrowState | null {
    const hasA = present(a);
    const hasB = present(b);
    if (!hasA) return hasB ? b : null;
    if (!hasB) return a;
    return newer(a, b, at);
}

export function mergeDeArrowState(a: DeArrowState | undefined, b: DeArrowState | undefined): DeArrowState | undefined {
    if (!a) return b;
    if (!b) return a;
    if (a.originalTitle !== b.originalTitle) return newer(a, b, "updatedAt");
    const merged: DeArrowState = { originalTitle: a.originalTitle, updatedAt: latest(a.updatedAt, b.updatedAt) };
    const verdict = pickBundle(a, b, "verdictUpdatedAt", state => typeof state.verdict === "boolean");
    if (verdict) {
        merged.verdict = verdict.verdict;
        merged.verdictReason = verdict.verdictReason;
        merged.verdictModel = verdict.verdictModel;
        merged.verdictUpdatedAt = verdict.verdictUpdatedAt;
    }
    const rewrite = pickBundle(a, b, "rewrittenAt", state => Boolean(state.rewrittenTitle));
    if (rewrite) {
        merged.rewrittenTitle = rewrite.rewrittenTitle;
        merged.rewriteModel = rewrite.rewriteModel;
        merged.rewrittenAt = rewrite.rewrittenAt;
    }
    const fix = pickBundle(a, b, "fixCheckedAt", state => Boolean(state.fixCheckedAt));
    if (fix) {
        if (fix.fixes?.length) merged.fixes = fix.fixes;
        merged.fixModel = fix.fixModel;
        merged.fixCheckedAt = fix.fixCheckedAt;
    }
    return merged;
}

export function mergeDeArrowMaps(...maps: Array<Record<string, DeArrowState>>): Record<string, DeArrowState> {
    const out: Record<string, DeArrowState> = {};
    for (const map of maps) {
        for (const [id, state] of Object.entries(map)) {
            const merged = mergeDeArrowState(out[id], state);
            if (merged) out[id] = merged;
        }
    }
    return out;
}
