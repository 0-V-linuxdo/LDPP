/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { isAbortError, pickJsonFile } from "../src/utils/misc";

function nextPicker(): Promise<HTMLInputElement> {
    return new Promise(resolve => {
        const original = HTMLInputElement.prototype.click;
        HTMLInputElement.prototype.click = function (this: HTMLInputElement) {
            HTMLInputElement.prototype.click = original;
            resolve(this);
        };
    });
}

describe("pickJsonFile", () => {
    test("keeps the input in the document while the chooser is open and removes it after a pick", async () => {
        const picker = nextPicker();
        const result = pickJsonFile();
        const input = await picker;
        expect(input.isConnected).toBe(true);
        expect(input.hidden).toBe(true);
        Object.defineProperty(input, "files", { value: [new File(['{"a":1}'], "a.json")] });
        input.dispatchEvent(new Event("change"));
        expect(await result).toEqual({ a: 1 });
        expect(input.isConnected).toBe(false);
    });

    test("a cancelled chooser rejects with an abort error and cleans up", async () => {
        const picker = nextPicker();
        const result = pickJsonFile();
        const input = await picker;
        input.dispatchEvent(new Event("cancel"));
        const error = await result.catch((reason: unknown) => reason);
        expect(isAbortError(error)).toBe(true);
        expect(input.isConnected).toBe(false);
    });
});
