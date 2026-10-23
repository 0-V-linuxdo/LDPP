/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { h, isOwnNode, mark, setClass } from "@utils/dom";
import { Logger } from "@utils/Logger";
import { applyEdits, normalizeText, type TextEdit } from "@utils/text";

import { rememberTopicTitle } from "./Discourse";
import { dispatch } from "./Events";
import { checkRoute, currentRoute, routeTo } from "./Navigation";

const logger = new Logger("TopicList", "#94e2d5");

export interface TopicRow {
    readonly id: string;
    readonly el: HTMLTableRowElement;
    readonly isBookmark: boolean;
    originalTitle: string;
    category: string;
    categoryId: string;
    tags: string[];
    hidden: boolean;
    readonly verdicts: Map<string, unknown>;
}

export interface RowFilter {
    id: string;
    test(row: TopicRow): unknown;
}

export interface RowDecorator {
    id: string;
    order: number;
    render(row: TopicRow, slot: HTMLElement): void;
}

/** A fragment to change in place (the rest of the title, emoji included, stays as rendered); `mark` is the [start, end) of `to` to highlight. */
export interface TitleEdit extends TextEdit {
    mark?: readonly [number, number];
}

/** A whole replacement title, or edits to the rendered one whose changed parts go in the CSS highlight `highlight`. */
export type TitleOverride = string | { edits: readonly TitleEdit[]; highlight: string };

export interface PageProcessor {
    id: string;
    run(rows: readonly TopicRow[]): void;
}

interface AppliedTitle {
    key: string;
    /** The title as shown, to tell our own text from a real change by the site. */
    text: string;
    stash: Array<[Text, string]>;
    ranges: Range[];
    highlight: string;
}

const ROW_SELECTOR = "tr.topic-list-item";
const TITLE_SELECTOR = "a.title, a.raw-topic-link";
const TOPIC_HREF = /\/t\/(?:[^/?#]+\/)?(\d+)/;

const rows = new WeakMap<HTMLTableRowElement, TopicRow>();
const applied = new WeakMap<HTMLTableRowElement, AppliedTitle>();
const internalText = new WeakMap<Text, string>();
const filters = new Map<string, RowFilter>();
const decorators = new Map<string, RowDecorator>();
const processors = new Map<string, PageProcessor>();
const titleOverrides = new Map<string, TitleOverride>();
const highlightNames = new Set<string>();
const titlePreviews = new Set<string>();
const titleMarks = new Map<string, string>();
const appliedMarks = new WeakMap<HTMLElement, string>();
const passListeners = new Set<(rows: readonly TopicRow[]) => void>();

let current: TopicRow[] = [];
let revealHidden = false;
let observer: MutationObserver | null = null;
let observedRoot: Element | null = null;
let pending = false;
let passCount = 0;

function topicIdOf(el: HTMLTableRowElement): string {
    const direct = el.dataset.topicId ?? el.querySelector<HTMLElement>("[data-topic-id]")?.dataset.topicId;
    if (direct) return direct;
    return el.querySelector<HTMLAnchorElement>(TITLE_SELECTOR)?.getAttribute("href")?.match(TOPIC_HREF)?.[1] ?? "";
}

function titleHolder(el: HTMLTableRowElement): HTMLElement | null {
    const anchor = el.querySelector<HTMLElement>(TITLE_SELECTOR);
    return anchor?.querySelector<HTMLElement>(":scope > span[dir]") ?? anchor ?? null;
}

function textNodes(holder: HTMLElement): Text[] {
    const out: Text[] = [];
    const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) out.push(node as Text);
    return out;
}

function readTitle(holder: HTMLElement): string {
    return normalizeText(holder.textContent);
}

function writeText(node: Text, value: string) {
    internalText.set(node, value);
    node.nodeValue = value;
}

const overrideKey = (override: TitleOverride) => typeof override === "string" ? override : `\u0000${override.highlight}\u0000${JSON.stringify(override.edits)}`;

/** The highlight registry entry, where the browser has the CSS Custom Highlight API (it changes no DOM, so Discourse's own nodes stay as they are). */
function highlightNamed(name: string): Highlight | null {
    if (!name || typeof Highlight === "undefined" || !globalThis.CSS?.highlights) return null;
    let highlight = CSS.highlights.get(name);
    if (!highlight) {
        highlight = new Highlight();
        CSS.highlights.set(name, highlight);
    }
    highlightNames.add(name);
    return highlight;
}

/** Forget what was applied to a row without writing back (the site re-rendered it, or it now shows another topic). */
function dropApplied(el: HTMLTableRowElement, holder: HTMLElement | null) {
    const state = applied.get(el);
    if (!state) return;
    applied.delete(el);
    const highlight = highlightNamed(state.highlight);
    for (const range of state.ranges) highlight?.delete(range);
    if (holder) {
        setClass(holder, "ldpp-title-overridden", false);
        setClass(holder, "ldpp-title-edited", false);
    }
}

function restoreTitle(el: HTMLTableRowElement, holder: HTMLElement | null) {
    const state = applied.get(el);
    if (!state) return;
    dropApplied(el, holder);
    for (const [node, value] of state.stash) if (holder?.contains(node)) writeText(node, value);
}

function applyEditsInPlace(nodes: Text[], edits: readonly TitleEdit[]): { stash: Array<[Text, string]>; ranges: Range[] } {
    const stash: Array<[Text, string]> = [];
    const ranges: Range[] = [];
    let remaining = edits.map((edit, index) => ({ edit, index }));
    for (const node of nodes) {
        if (!remaining.length) break;
        const value = node.nodeValue ?? "";
        const { text, placed } = applyEdits(value, remaining.map(item => item.edit));
        if (!placed.length) continue;
        stash.push([node, value]);
        writeText(node, text);
        for (const { edit, start } of placed) {
            const { to, mark: span = [0, to.length] } = remaining[edit].edit;
            if (span[1] <= span[0] || typeof document.createRange !== "function") continue;
            const range = document.createRange();
            range.setStart(node, start + span[0]);
            range.setEnd(node, start + Math.min(span[1], to.length));
            ranges.push(range);
        }
        const used = new Set(placed.map(item => item.edit));
        remaining = remaining.filter((_, index) => !used.has(index));
    }
    return { stash, ranges };
}

function applyTitle(el: HTMLTableRowElement, holder: HTMLElement, override: TitleOverride) {
    restoreTitle(el, holder);
    const nodes = textNodes(holder).filter(node => node.nodeValue?.trim());
    if (!nodes.length) return;
    const key = overrideKey(override);
    if (typeof override === "string") {
        const stash: Array<[Text, string]> = nodes.map(node => [node, node.nodeValue ?? ""]);
        writeText(nodes[0], override);
        for (const node of nodes.slice(1)) writeText(node, "");
        holder.classList.add("ldpp-title-overridden");
        applied.set(el, { key, text: override, stash, ranges: [], highlight: "" });
        return;
    }
    // Only the fragments change, in the text nodes that hold them: emoji and the rest of the title keep their places.
    const { stash, ranges } = applyEditsInPlace(nodes, override.edits);
    const highlight = highlightNamed(override.highlight);
    for (const range of ranges) highlight?.add(range);
    if (stash.length) holder.classList.add("ldpp-title-overridden", "ldpp-title-edited");
    applied.set(el, { key, text: readTitle(holder), stash, ranges, highlight: override.highlight });
}

/** Ranges whose rows left the page (navigation, re-render). */
function pruneHighlights() {
    for (const name of highlightNames) {
        const highlight = globalThis.CSS?.highlights?.get(name);
        highlight?.forEach(range => { if (!(range as Range).startContainer.isConnected) highlight.delete(range); });
    }
}

function extract(el: HTMLTableRowElement): TopicRow | null {
    const id = topicIdOf(el);
    if (!id) return null;
    const holder = titleHolder(el);
    const domTitle = holder ? readTitle(holder) : "";
    let row = rows.get(el);
    if (!row || row.id !== id) {
        dropApplied(el, holder);
        row = {
            id,
            el,
            isBookmark: el.classList.contains("bookmark-list-item"),
            originalTitle: domTitle,
            category: "",
            categoryId: "",
            tags: [],
            hidden: false,
            verdicts: new Map(),
        };
        rows.set(el, row);
    } else {
        const state = applied.get(el);
        if (!state) row.originalTitle = domTitle;
        else if (domTitle !== normalizeText(state.text)) {
            dropApplied(el, holder);
            row.originalTitle = domTitle;
        }
    }
    rememberTopicTitle(id, row.originalTitle);
    const badge = el.querySelector<HTMLElement>(".badge-category__name");
    row.category = normalizeText(badge?.textContent);
    row.categoryId = el.querySelector<HTMLElement>("[data-category-id]")?.dataset.categoryId ?? "";
    const tagNames = Array.from(el.querySelectorAll<HTMLElement>(".discourse-tags [data-tag-name], a.discourse-tag"), tag => normalizeText(tag.dataset.tagName ?? tag.textContent));
    row.tags = Array.from(new Set(tagNames.filter(Boolean)));
    return row;
}

function presentMark(row: TopicRow, holder: HTMLElement) {
    const desired = titleMarks.get(row.id) ?? "";
    const previous = appliedMarks.get(holder) ?? "";
    if (desired === previous) return;
    if (previous) holder.classList.remove(`ldpp-title-mark-${previous}`);
    if (desired) {
        holder.classList.add(`ldpp-title-mark-${desired}`);
        appliedMarks.set(holder, desired);
    } else {
        appliedMarks.delete(holder);
    }
}

function presentTitle(row: TopicRow) {
    const holder = titleHolder(row.el);
    if (!holder) return;
    presentMark(row, holder);
    const override = titleOverrides.get(row.id);
    const desired = override && !titlePreviews.has(row.id) ? override : null;
    const state = applied.get(row.el);
    if (!desired) {
        if (state) restoreTitle(row.el, holder);
        return;
    }
    if (state?.key !== overrideKey(desired)) applyTitle(row.el, holder, desired);
}

function actionBar(row: TopicRow): HTMLElement | null {
    const existing = row.el.querySelector<HTMLElement>(":scope .ldpp-actions");
    if (existing) return existing;
    const host = row.el.querySelector(".link-bottom-line") ?? row.el.querySelector("td.main-link") ?? row.el.querySelector("td");
    if (!host) return null;
    const bar = mark(h("div", { class: "ldpp-actions" }), "actions");
    host.appendChild(bar);
    return bar;
}

function slotFor(bar: HTMLElement, decorator: RowDecorator): HTMLElement {
    const found = bar.querySelector<HTMLElement>(`:scope > [data-slot="${decorator.id}"]`);
    if (found) return found;
    const slot = h("span", { class: "ldpp-slot", dataset: { slot: decorator.id, order: String(decorator.order) } });
    const after = Array.from(bar.children).find(child => Number((child as HTMLElement).dataset.order) > decorator.order);
    bar.insertBefore(slot, after ?? null);
    return slot;
}

function decorate(row: TopicRow) {
    if (!decorators.size) {
        row.el.querySelector(":scope .ldpp-actions")?.remove();
        return;
    }
    const bar = actionBar(row);
    if (!bar) return;
    for (const slot of Array.from(bar.children) as HTMLElement[]) {
        if (!decorators.has(slot.dataset.slot ?? "")) slot.remove();
    }
    for (const decorator of decorators.values()) {
        try { decorator.render(row, slotFor(bar, decorator)); } catch (error) { logger.error(`装饰器 ${decorator.id} 出错`, error); }
    }
}

function syncPanels(live: Map<string, HTMLTableRowElement>) {
    for (const panel of Array.from(document.querySelectorAll<HTMLTableRowElement>("tr.ldpp-panel-row"))) {
        const owner = live.get(panel.dataset.topicId ?? "");
        if (!owner) {
            panel.remove();
            continue;
        }
        if (owner.nextElementSibling !== panel) owner.after(panel);
    }
}

function runPass() {
    pending = false;
    passCount++;
    checkRoute();
    const root = document.querySelector("#main-outlet") ?? document.body;
    if (root !== observedRoot) observe(root);
    const next: TopicRow[] = [];
    const live = new Map<string, HTMLTableRowElement>();
    for (const el of Array.from(root.querySelectorAll<HTMLTableRowElement>(ROW_SELECTOR))) {
        const row = extract(el);
        if (!row) continue;
        next.push(row);
        if (!live.has(row.id)) live.set(row.id, el);
    }
    for (const row of next) {
        row.verdicts.clear();
        for (const filter of filters.values()) {
            const verdict = filter.test(row);
            if (verdict != null) row.verdicts.set(filter.id, verdict);
        }
        row.hidden = row.verdicts.size > 0;
        setClass(row.el, "ldpp-hidden", row.hidden && !revealHidden);
        setClass(row.el, "ldpp-revealed", row.hidden && revealHidden);
        presentTitle(row);
        decorate(row);
    }
    current = next;
    pruneHighlights();
    syncPanels(live);
    for (const processor of processors.values()) {
        try { processor.run(next); } catch (error) { logger.error(`处理器 ${processor.id} 出错`, error); }
    }
    for (const listener of Array.from(passListeners)) {
        try { listener(next); } catch (error) { logger.error("列表监听器出错", error); }
    }
}

function isInternal(mutation: MutationRecord): boolean {
    if (mutation.type === "characterData") {
        const node = mutation.target as Text;
        if (internalText.get(node) === node.nodeValue) return true;
        return !node.parentElement?.closest(TITLE_SELECTOR);
    }
    if (isOwnNode(mutation.target)) return true;
    const changed = [...Array.from(mutation.addedNodes), ...Array.from(mutation.removedNodes)];
    return changed.length > 0 && changed.every(node => node instanceof Element ? node.hasAttribute("data-ldpp") || node.matches("tr.ldpp-panel-row") : node.nodeType === Node.TEXT_NODE && internalText.has(node as Text));
}

function observe(root: Element) {
    observer?.disconnect();
    observedRoot = root;
    observer = new MutationObserver(mutations => {
        if (mutations.some(mutation => !isInternal(mutation))) schedule();
    });
    observer.observe(root, { childList: true, subtree: true, characterData: true });
}

export function schedule() {
    if (pending) return;
    pending = true;
    if (typeof requestAnimationFrame === "function" && document.visibilityState !== "hidden") requestAnimationFrame(runPass);
    else setTimeout(runPass, 16);
}

export function flushNow() {
    runPass();
}

export function startTopicList() {
    schedule();
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") schedule();
    });
}

export function registerFilter(filter: RowFilter) {
    filters.set(filter.id, filter);
    schedule();
}

export function unregisterFilter(id: string) {
    if (filters.delete(id)) schedule();
}

export function registerDecorator(decorator: RowDecorator) {
    decorators.set(decorator.id, decorator);
    schedule();
}

export function unregisterDecorator(id: string) {
    if (!decorators.delete(id)) return;
    for (const slot of Array.from(document.querySelectorAll(`.ldpp-actions > [data-slot="${id}"]`))) slot.remove();
    schedule();
}

export function registerProcessor(processor: PageProcessor) {
    processors.set(processor.id, processor);
    schedule();
}

export function unregisterProcessor(id: string) {
    processors.delete(id);
}

export function onPass(listener: (rows: readonly TopicRow[]) => void): () => void {
    passListeners.add(listener);
    return () => passListeners.delete(listener);
}

export function setTitleOverride(topicId: string, title: TitleOverride | null) {
    if (title && (typeof title === "string" || title.edits.length)) titleOverrides.set(topicId, title);
    else titleOverrides.delete(topicId);
    for (const row of rowsForTopic(topicId)) presentTitle(row);
}

export function setTitleMark(topicId: string, name: string | null) {
    if (name) titleMarks.set(topicId, name);
    else titleMarks.delete(topicId);
    for (const row of rowsForTopic(topicId)) presentTitle(row);
}

export function setTitlePreview(topicId: string, previewing: boolean) {
    if (previewing) titlePreviews.add(topicId);
    else titlePreviews.delete(topicId);
    for (const row of rowsForTopic(topicId)) presentTitle(row);
}

export function displayedTitle(row: TopicRow): string {
    const override = titleOverrides.get(row.id);
    if (override === undefined) return row.originalTitle;
    return typeof override === "string" ? override : applyEdits(row.originalTitle, override.edits).text;
}

export function setRevealHidden(value: boolean) {
    revealHidden = value;
    for (const row of current) {
        setClass(row.el, "ldpp-hidden", row.hidden && !revealHidden);
        setClass(row.el, "ldpp-revealed", row.hidden && revealHidden);
    }
}

export function isRevealHidden(): boolean {
    return revealHidden;
}

export function getRows(): readonly TopicRow[] {
    return current.filter(row => row.el.isConnected);
}

export function visibleRows(): TopicRow[] {
    return current.filter(row => row.el.isConnected && (!row.hidden || revealHidden));
}

export function rowsForTopic(topicId: string): TopicRow[] {
    return current.filter(row => row.id === topicId && row.el.isConnected);
}

export function flashRow(row: TopicRow) {
    row.el.classList.remove("ldpp-flash");
    void row.el.offsetWidth;
    row.el.classList.add("ldpp-flash");
    setTimeout(() => row.el.classList.remove("ldpp-flash"), 1600);
}

/**
 * What clicking a topic toast does: plugins get the first say (list panel, topic sidebar); otherwise the topic's row
 * is scrolled into view, and failing that the topic itself is opened.
 */
export function focusTopic(topicId: string, view: "summary" | "question" | "locate" = "summary") {
    const event = { topicId, view, handled: false };
    dispatch("focusTopic", event);
    if (event.handled) return;
    const row = rowsForTopic(topicId).find(item => !item.hidden);
    if (row) {
        row.el.scrollIntoView({ block: "center", behavior: "smooth" });
        flashRow(row);
        return;
    }
    if (currentRoute().topicId === topicId) return;
    routeTo(`/t/topic/${topicId}`);
}

export function getPanelRow(row: TopicRow, create: boolean): HTMLElement | null {
    const next = row.el.nextElementSibling as HTMLTableRowElement | null;
    if (next?.matches("tr.ldpp-panel-row") && next.dataset.topicId === row.id) return next.querySelector<HTMLElement>(".ldpp-panel");
    if (!create) return null;
    const panel = h("div", { class: "ldpp-panel" });
    const tr = h("tr", { class: "ldpp-panel-row", dataset: { topicId: row.id } }, h("td", { colSpan: Math.max(1, row.el.cells.length) }, panel));
    mark(tr, "panel");
    row.el.after(tr);
    return panel;
}

export function removePanelRow(topicId: string) {
    for (const tr of Array.from(document.querySelectorAll<HTMLElement>(`tr.ldpp-panel-row[data-topic-id="${CSS.escape(topicId)}"]`))) tr.remove();
}

export function getPassCount(): number {
    return passCount;
}
