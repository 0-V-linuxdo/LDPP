/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { mapGetOrCreate } from "@utils/misc";

import type { RouteInfo } from "./Navigation";
import type { ToastType } from "./Notifications";

export type DataStoreName = "summaries" | "questions" | "summarized" | "dearrow";
export type DataChangeSource = "local" | "remote" | "drive" | "import";

export interface LDPPEventMap {
    navigate: { route: RouteInfo; previous: RouteInfo | null };
    pluginToggle: { name: string; enabled: boolean };
    dataChange: { store: DataStoreName; ids: string[]; source: DataChangeSource };
    openSettings: { tab?: string; plugin?: string };
    summaryUpdated: { topicId: string };
    /** "locate" only brings the topic into view; "summary" / "question" also open that panel. */
    /** tone is the clicked toast's type, which the original script's highlight is coloured by. */
    focusTopic: { topicId: string; view: "summary" | "question" | "locate"; tone: ToastType; handled: boolean };
    /** An AI summary or question for a topic started, finished, failed or was cancelled. */
    aiTask: { kind: "summary" | "question"; topicId: string; state: "start" | "done" | "error" | "cancel"; message?: string };
}

export type LDPPEvent = keyof LDPPEventMap;
type Handler = (data: unknown) => void;

const logger = new Logger("Events");
const listeners = new Map<LDPPEvent, Set<Handler>>();

export function subscribe<E extends LDPPEvent>(event: E, handler: (data: LDPPEventMap[E]) => void): () => void {
    const set = mapGetOrCreate(listeners, event, () => new Set<Handler>());
    set.add(handler as Handler);
    return () => {
        set.delete(handler as Handler);
        if (!set.size) listeners.delete(event);
    };
}

export function dispatch<E extends LDPPEvent>(event: E, data: LDPPEventMap[E]) {
    const set = listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
        try { handler(data); } catch (error) { logger.error(`事件 ${event} 处理出错`, error); }
    }
}
