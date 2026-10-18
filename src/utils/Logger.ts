/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type LogLevel = "log" | "info" | "warn" | "error" | "debug";

const CAP = "color:#111;font-weight:700;padding:1px 6px;border-radius:6px 0 0 6px;background:linear-gradient(135deg,#f9d77e,#f2a65a);";
const BODY = "background:#1f2329;font-weight:600;padding:1px 6px;border-radius:0 6px 6px 0;";

export class Logger {
    constructor(public name: string, public color = "#d4dbe3") {}

    private emit(level: LogLevel, args: unknown[]) {
        const sink = level === "error" ? console.error : level === "warn" ? console.warn : level === "debug" ? console.debug : console.log;
        if (typeof window === "undefined") {
            sink(`[LD++ ${this.name}]`, ...args);
            return;
        }
        sink(`%cLD++%c${this.name}%c`, CAP, `${BODY}color:${this.color};`, "", ...args);
    }

    log(...args: unknown[]) { this.emit("log", args); }
    info(...args: unknown[]) { this.emit("info", args); }
    warn(...args: unknown[]) { this.emit("warn", args); }
    error(...args: unknown[]) { this.emit("error", args); }
    debug(...args: unknown[]) { if (IS_DEV) this.emit("debug", args); }
}
