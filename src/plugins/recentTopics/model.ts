/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isObject } from "@utils/guards";

export interface RecentTopic {
    id: string;
    title: string;
    /** The floor last read, from the topic URL (/t/slug/id/N). */
    floor: number;
    visitedAt: number;
}

export const MAX_STORED = 50;

export function normalizeRecent(raw: unknown): RecentTopic[] {
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const out: RecentTopic[] = [];
    for (const item of raw) {
        if (!isObject(item)) continue;
        const id = String(item.id ?? "").trim();
        if (!/^\d+$/.test(id) || seen.has(id)) continue;
        seen.add(id);
        out.push({
            id,
            title: typeof item.title === "string" ? item.title : "",
            floor: Number.isInteger(item.floor) && (item.floor as number) > 0 ? item.floor as number : 0,
            visitedAt: Number.isFinite(item.visitedAt) ? item.visitedAt as number : 0,
        });
    }
    return out.toSorted((a, b) => b.visitedAt - a.visitedAt).slice(0, MAX_STORED);
}

/** Moves (or adds) a topic to the front; an empty title or floor keeps what was known. */
export function touchRecent(list: readonly RecentTopic[], visit: { id: string; title?: string; floor?: number }, now = Date.now()): RecentTopic[] {
    const old = list.find(item => item.id === visit.id);
    const next: RecentTopic = {
        id: visit.id,
        title: visit.title || old?.title || "",
        floor: visit.floor || old?.floor || 0,
        visitedAt: now,
    };
    return [next, ...list.filter(item => item.id !== visit.id)].slice(0, MAX_STORED);
}

/** Updates a known topic in place (title or floor) without making it the most recent. */
export function patchRecent(list: readonly RecentTopic[], id: string, patch: Partial<Pick<RecentTopic, "title" | "floor">>): RecentTopic[] {
    let changed = false;
    const next = list.map(item => {
        if (item.id !== id) return item;
        const title = patch.title || item.title;
        const floor = patch.floor || item.floor;
        if (title === item.title && floor === item.floor) return item;
        changed = true;
        return { ...item, title, floor };
    });
    return changed ? next : [...list];
}

/** The floor in a topic path: /t/slug/123/45 → 45, none → 0. */
export function floorOf(path: string): number {
    const match = path.match(/^\/t\/(?:[^/]+\/)?\d+\/(\d+)\/?$/);
    return match ? Number(match[1]) : 0;
}

/** Where selection starts: the previous topic when the first card is the one on screen, as Alt+Tab does. */
export function initialIndex(list: readonly RecentTopic[], currentId: string | null): number {
    if (list.length < 2) return 0;
    return list[0].id === currentId ? 1 : 0;
}

export function wrapIndex(index: number, length: number): number {
    return length ? ((index % length) + length) % length : 0;
}

export function timeAgo(time: number, now = Date.now()): string {
    const seconds = Math.max(0, Math.round((now - time) / 1000));
    if (seconds < 60) return "刚刚";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.round(hours / 24);
    if (days < 30) return `${days} 天前`;
    return new Date(time).toLocaleDateString();
}

export { summaryExcerpt } from "@utils/text";
