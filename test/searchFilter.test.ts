/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { withoutSearchVerdicts } from "../src/plugins/searchFilter";

describe("removing search rules from the reasons dialog", () => {
    const rule = { blacklist: ["出售", "Plus"], whitelist: ["gpt", "claude"], regex: ["/代.?认证/", "学生"] };

    test("drops matching keywords case-insensitively and exact regex patterns", () => {
        const next = withoutSearchVerdicts(rule, [{ kind: "blacklist", value: "plus" }, { kind: "regex", value: "/代.?认证/" }]);
        expect(next).toEqual({ blacklist: ["出售"], whitelist: ["gpt", "claude"], regex: ["学生"] });
    });

    test("a missing-whitelist verdict clears the whole whitelist", () => {
        const next = withoutSearchVerdicts(rule, [{ kind: "whitelist", value: "gpt、claude" }]);
        expect(next.whitelist).toEqual([]);
        expect(next.blacklist).toEqual(rule.blacklist);
        expect(next.regex).toEqual(rule.regex);
    });
});
