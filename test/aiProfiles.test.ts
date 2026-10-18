/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { type AIProfile, DEFAULT_PROFILE, requireProfile } from "../src/api/AI";
import { copyName, uniqueName } from "../src/plugins/_core/ai";

const named = (...names: string[]): AIProfile[] => names.map((name, index) => ({ ...DEFAULT_PROFILE, id: `p${index}`, name }));

describe("AI profile names", () => {
    test("new profiles are numbered without a copy suffix", () => {
        expect(uniqueName("新配置", named("Mock"))).toBe("新配置");
        expect(uniqueName("新配置", named("Mock", "新配置"))).toBe("新配置 2");
        expect(uniqueName("新配置", named("新配置", "新配置 2"))).toBe("新配置 3");
    });

    test("copies get one copy suffix, numbered when taken", () => {
        expect(copyName("Mock", named("Mock"))).toBe("Mock 副本");
        expect(copyName("Mock", named("Mock", "Mock 副本"))).toBe("Mock 副本 2");
        expect(copyName("Mock 副本 2", named("Mock", "Mock 副本", "Mock 副本 2"))).toBe("Mock 副本 3");
    });
});

describe("requireProfile", () => {
    test("rejects a missing profile or key before any request is made", () => {
        expect(() => requireProfile(null)).toThrow("尚未配置 AI 接口");
        expect(() => requireProfile({ ...DEFAULT_PROFILE, id: "x", name: "默认配置", key: "" })).toThrow("AI 配置「默认配置」没有填写 API Key");
        const ready = { ...DEFAULT_PROFILE, id: "x", key: "sk-test" };
        expect(requireProfile(ready)).toBe(ready);
    });
});
