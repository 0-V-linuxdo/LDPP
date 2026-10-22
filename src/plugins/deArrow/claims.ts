/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { gmDelete, gmGet, gmSet } from "@utils/gm";
import { isObject } from "@utils/guards";
import { sleep } from "@utils/misc";

/**
 * Every open linux.do tab runs DeArrow over the same lists. A claim tells the other tabs that this one is already
 * asking the AI about a topic, so they leave it alone instead of sending the same request again (and, for a
 * rewrite, getting back a second, different title). A claim lapses on its own if its tab goes away mid-request.
 */
export type ClaimKind = "judge" | "rewrite" | "fix";

const TTL_MS = 5 * 60_000;
/** Long enough for another tab's claim written at the same moment to reach this one. */
const CONFIRM_MS = 150;

const tabId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const keyFor = (kind: ClaimKind, topicId: string) => `LDPP.dearrowClaim.${kind}.${topicId}`;

function holder(kind: ClaimKind, topicId: string): string | null {
    const stored = gmGet<unknown>(keyFor(kind, topicId), null);
    if (!isObject(stored) || typeof stored.tab !== "string" || typeof stored.until !== "number" || stored.until <= Date.now()) return null;
    return stored.tab;
}

/** Whether another tab is asking the AI about this topic right now. */
export function heldElsewhere(kind: ClaimKind, topicId: string): boolean {
    const tab = holder(kind, topicId);
    return tab !== null && tab !== tabId;
}

/** Claims the topic for this tab; false when another tab holds it or claimed it at the same moment. */
export async function claim(kind: ClaimKind, topicId: string, confirmMs = CONFIRM_MS): Promise<boolean> {
    if (heldElsewhere(kind, topicId)) return false;
    gmSet(keyFor(kind, topicId), { tab: tabId, until: Date.now() + TTL_MS });
    await sleep(confirmMs);
    return holder(kind, topicId) === tabId;
}

export function release(kind: ClaimKind, topicId: string) {
    if (holder(kind, topicId) === tabId) gmDelete(keyFor(kind, topicId));
}
