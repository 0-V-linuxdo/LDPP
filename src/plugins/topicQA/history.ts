/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Void++'s InputHistory for the question box: ↑ / ↓ step through questions asked before, newest first, like a shell.
// What was being typed is kept as the draft and comes back past the newest entry or with Esc. The history is shared by
// every topic and stored on its own, newest first, without repeats.

import { gmGet, gmSet } from "@utils/gm";

const KEY = "LDPP.qaHistory";

export function loadHistory(): string[] {
    const raw = gmGet<unknown>(KEY, []);
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
}

/** Puts a question at the front, dropping an earlier copy and anything past `limit`. */
export function pushHistory(list: readonly string[], question: string, limit: number): string[] {
    const text = question.trim();
    if (!text) return [...list];
    return [text, ...list.filter(item => item !== text)].slice(0, Math.max(0, limit));
}

export function rememberQuestion(question: string, limit: number) {
    gmSet(KEY, pushHistory(loadHistory(), question, limit));
}

export function clearHistory() {
    gmSet(KEY, []);
}

/**
 * A cursor over the history for one input. -1 is the draft; 0 the newest entry. `older` / `newer` return the text to
 * show, or null when there is nowhere to go (the key then does what it normally does).
 */
export class HistoryCursor {
    private index = -1;
    private draft = "";

    constructor(private readonly entries: () => readonly string[]) {}

    get browsing(): boolean {
        return this.index >= 0;
    }

    older(current: string): string | null {
        const list = this.entries();
        if (this.index + 1 >= list.length) return null;
        if (this.index < 0) this.draft = current;
        this.index++;
        return list[this.index];
    }

    newer(): string | null {
        if (this.index < 0) return null;
        this.index--;
        return this.index < 0 ? this.draft : this.entries()[this.index] ?? this.draft;
    }

    /** Back to the draft, as Esc does. */
    restore(): string | null {
        if (this.index < 0) return null;
        this.index = -1;
        return this.draft;
    }

    /** The user typed: what is in the box is the draft now. */
    reset() {
        this.index = -1;
        this.draft = "";
    }
}

/** The caret is on the first line (↑ leaves the box's own line movement alone otherwise). */
export function onFirstLine(field: HTMLTextAreaElement): boolean {
    return field.selectionStart === field.selectionEnd && !field.value.slice(0, field.selectionStart).includes("\n");
}

export function onLastLine(field: HTMLTextAreaElement): boolean {
    return field.selectionStart === field.selectionEnd && !field.value.slice(field.selectionEnd).includes("\n");
}
