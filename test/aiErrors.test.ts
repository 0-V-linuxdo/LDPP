/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { errorBodyReason } from "../src/api/AI";
import { gmErrorReason } from "../src/api/Http";

describe("AI error reasons", () => {
    test("reads OpenAI style error bodies", () => {
        expect(errorBodyReason(JSON.stringify({ error: { message: "Invalid API key", type: "invalid_request_error" } }))).toBe("Invalid API key");
        expect(errorBodyReason(JSON.stringify({ error: "model not found" }))).toBe("model not found");
        expect(errorBodyReason(JSON.stringify({ detail: "Too many requests" }))).toBe("Too many requests");
    });

    test("reduces HTML gateway pages to their title", () => {
        expect(errorBodyReason("<html><head><title>502 Bad Gateway</title></head><body>nginx</body></html>")).toBe("502 Bad Gateway");
    });

    test("empty body has no reason", () => {
        expect(errorBodyReason("  ")).toBe("");
    });

    test("describes GM_xmlhttpRequest failures", () => {
        expect(gmErrorReason({ error: "Refused to connect: not part of @connect list", status: 0 })).toBe("Refused to connect: not part of @connect list");
        expect(gmErrorReason({ status: 0, statusText: "" })).toContain("无法建立连接");
        expect(gmErrorReason({ status: 502, statusText: "Bad Gateway" })).toBe("HTTP 502 Bad Gateway");
    });
});
