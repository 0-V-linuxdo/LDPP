/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { RecordStore } from "../src/api/DataStore";
import { type DeArrowState, mergeDeArrowState, normalizeDeArrowMap } from "../src/api/records";

const KEY = "LDPP.test.dearrow";
const GM_NAMES = ["GM_getValue", "GM_setValue", "GM_addValueChangeListener"] as const;
const g = globalThis as Record<string, unknown>;

type Listener = (name: string, old: unknown, value: unknown, remote: boolean) => void;

let stored: unknown;
let listeners: Listener[];

beforeEach(() => {
    stored = {};
    listeners = [];
    g.GM_getValue = (_key: string, fallback: unknown) => stored ?? fallback;
    g.GM_setValue = (_key: string, value: unknown) => { stored = structuredClone(value); };
    g.GM_addValueChangeListener = (_key: string, listener: Listener) => { listeners.push(listener); };
});

afterEach(() => {
    for (const name of GM_NAMES) delete g[name];
});

/** One browser tab: its own copy of the store, told about other tabs' writes only when `hear` is called. */
function tab() {
    const store = new RecordStore<DeArrowState>("dearrow", KEY, normalizeDeArrowMap, (local, other) => mergeDeArrowState(local, other) ?? local);
    store.watchRemote();
    const listener = listeners[listeners.length - 1];
    return { store, hear: (value: unknown) => listener(KEY, null, value, true) };
}

const rewritten = (title: string, at: string): DeArrowState => ({ originalTitle: "震惊！", verdict: true, rewrittenTitle: title, rewrittenAt: at, updatedAt: at });

describe("record store across tabs", () => {
    test("tabs that hear each other's writes out of order settle on the same rewritten title", () => {
        const a = tab();
        const b = tab();
        a.store.set("1", rewritten("标题甲", "2026-01-01T00:00:01.000Z"));
        a.store.flush();
        const fromA = structuredClone(stored);
        b.store.set("1", rewritten("标题乙", "2026-01-01T00:00:02.000Z"));
        b.store.flush();
        const fromB = structuredClone(stored);
        // B hears A's older write only after its own newer one, as happens when both flush at about the same time.
        a.hear(fromB);
        b.hear(fromA);
        expect(a.store.get("1")?.rewrittenTitle).toBe("标题乙");
        expect(b.store.get("1")?.rewrittenTitle).toBe("标题乙");
        // Later unrelated writes from either tab no longer flip the title back and forth.
        a.store.set("2", { originalTitle: "别的", updatedAt: "2026-01-01T00:00:03.000Z" });
        a.store.flush();
        b.hear(structuredClone(stored));
        b.store.set("3", { originalTitle: "又一个", updatedAt: "2026-01-01T00:00:04.000Z" });
        b.store.flush();
        a.hear(structuredClone(stored));
        expect(a.store.get("1")?.rewrittenTitle).toBe("标题乙");
        expect(b.store.get("1")?.rewrittenTitle).toBe("标题乙");
        expect(Object.keys(stored as object).sort()).toEqual(["1", "2", "3"]);
    });

    test("a flush writes only this tab's changes over what another tab stored", () => {
        const a = tab();
        const b = tab();
        a.store.get("1");
        b.store.set("1", rewritten("标题乙", "2026-01-01T00:00:02.000Z"));
        b.store.flush();
        a.store.set("2", { originalTitle: "别的", updatedAt: "2026-01-01T00:00:03.000Z" });
        a.store.flush();
        expect(normalizeDeArrowMap(stored)["1"]?.rewrittenTitle).toBe("标题乙");
        expect(a.store.get("1")?.rewrittenTitle).toBe("标题乙");
    });

    test("equal timestamps pick the same winner in either order", () => {
        const x = rewritten("标题甲", "2026-01-01T00:00:01.000Z");
        const y = rewritten("标题乙", "2026-01-01T00:00:01.000Z");
        expect(mergeDeArrowState(x, y)).toEqual(mergeDeArrowState(y, x));
    });
});
