/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { beforeEach, describe, expect, test } from "bun:test";

import { gmGet, gmSet } from "../src/utils/gm";
import { claim, heldElsewhere, release } from "../src/plugins/deArrow/claims";

const KEY = "LDPP.dearrowClaim.rewrite.42";

beforeEach(() => localStorage.clear());

describe("DeArrow request claims across tabs", () => {
    test("a tab claims a free topic and frees it again", async () => {
        expect(await claim("rewrite", "42", 0)).toBe(true);
        expect(heldElsewhere("rewrite", "42")).toBe(false);
        release("rewrite", "42");
        expect(gmGet(KEY, null)).toBeNull();
    });

    test("a topic another tab is asking about is left alone", async () => {
        gmSet(KEY, { tab: "other", until: Date.now() + 60_000 });
        expect(heldElsewhere("rewrite", "42")).toBe(true);
        expect(await claim("rewrite", "42", 0)).toBe(false);
        release("rewrite", "42");
        expect(gmGet<{ tab: string }>(KEY, { tab: "" }).tab).toBe("other");
    });

    test("a claim left by a closed tab lapses", async () => {
        gmSet(KEY, { tab: "other", until: Date.now() - 1 });
        expect(heldElsewhere("rewrite", "42")).toBe(false);
        expect(await claim("rewrite", "42", 0)).toBe(true);
    });

    test("when two tabs claim at once, the one whose claim was overwritten backs off", async () => {
        const pending = claim("rewrite", "42", 20);
        gmSet(KEY, { tab: "other", until: Date.now() + 60_000 });
        expect(await pending).toBe(false);
    });
});
