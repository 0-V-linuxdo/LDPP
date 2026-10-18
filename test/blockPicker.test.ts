/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { afterEach, describe, expect, test } from "bun:test";

import { closeAllDialogs } from "../src/api/Dialog";
import { type BlockSelection, openBlockPicker } from "../src/plugins/topicBlocker/dialogs";

function open(apply: (selection: BlockSelection) => void) {
    openBlockPicker({ dialogTitle: "屏蔽此搜索结果", title: "出临期gpt team，10.5账单日", category: "跳蚤市场", tags: ["纯水"], keywordTarget: "「#trade」的屏蔽词", apply });
    return document.querySelector<HTMLElement>(".ldpp-dialog")!;
}

const confirm = (dialog: HTMLElement) => Array.from(dialog.querySelectorAll<HTMLButtonElement>(".ldpp-dialog-footer button")).find(button => button.textContent === "屏蔽")!.click();

describe("block picker (屏蔽选择器)", () => {
    afterEach(() => closeAllDialogs());

    test("offers the title, the category and each tag as choices", () => {
        const dialog = open(() => {});
        expect(dialog.querySelector<HTMLTextAreaElement>(".ldpp-title-source")?.value).toBe("出临期gpt team，10.5账单日");
        expect(Array.from(dialog.querySelectorAll(".ldpp-check span"), span => span.textContent)).toEqual(["跳蚤市场", "纯水"]);
    });

    test("selected text becomes a keyword; ticked category / tags are passed on", async () => {
        let picked = null as BlockSelection | null;
        const dialog = open(selection => { picked = selection; });
        const box = dialog.querySelector<HTMLTextAreaElement>(".ldpp-title-source")!;
        box.setSelectionRange(1, 6);
        box.dispatchEvent(new Event("select"));
        Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find(button => button.textContent === "添加选中文字")!.click();
        const tag = Array.from(dialog.querySelectorAll<HTMLInputElement>(".ldpp-check input"))[1];
        tag.checked = true;
        tag.dispatchEvent(new Event("change"));
        expect(dialog.querySelector(".ldpp-block-preview")?.textContent).toBe("将添加 → 「#trade」的屏蔽词：临期gpt；标签：纯水");
        confirm(dialog);
        await Promise.resolve();
        expect(picked).toEqual({ keywords: ["临期gpt"], categories: [], tags: ["纯水"] });
    });

    test("with nothing picked, the whole title is used", async () => {
        let picked = null as BlockSelection | null;
        confirm(open(selection => { picked = selection; }));
        await Promise.resolve();
        expect(picked).toEqual({ keywords: ["出临期gpt team，10.5账单日"], categories: [], tags: [] });
    });
});
