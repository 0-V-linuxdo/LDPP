/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isNonNullish<T>(value: T): value is Exclude<T, null | undefined> {
    return value != null;
}

export function asString(value: unknown): string {
    return value == null ? "" : String(value).trim();
}

export function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.map(asString).filter(Boolean);
}

export function asInt(value: unknown, fallback: number, min: number, max: number): number {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
}
