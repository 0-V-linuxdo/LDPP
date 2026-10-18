/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { pageWindow } from "@utils/misc";

import * as LDPP from "./LDPP";

const host = pageWindow as { LDPP?: unknown };

if (window === window.top && !host.LDPP) {
    Object.defineProperty(host, "LDPP", { value: LDPP, configurable: true, writable: false });
    try {
        LDPP.init();
    } catch (error) {
        console.error("[LD++] 初始化失败", error);
    }
}
