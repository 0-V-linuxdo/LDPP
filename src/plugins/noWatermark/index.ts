/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// 「去除隐藏水印」: a watermark layer tied to the account (see detect.ts) is hidden as soon as it is inserted, before the
// frame is painted, so a screenshot never has it. The page's own elements are never removed or edited: watermark
// scripts watch their layer and put it back, so the plugin only appends a style rule that the page does not see.
// Watermarks burnt into images on the server, and browser fingerprinting, are out of reach of a page script.

import "./styles.css";

import { showToast } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button, Field, Switch } from "@components/controls";
import { EraserIcon } from "@components/icons";
import { disableStyle, enableStyle, registerStyle, unregisterStyle } from "@utils/css";
import { h, isOwnNode } from "@utils/dom";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, StartAt } from "@utils/types";

import { currentAccount, describe, Detector, type Finding, hidingCss } from "./detect";
import { hookShadowRoots, outerHost, unhookShadowRoots } from "./shadow";

const STYLE = "no-watermark";
const FULL_SCAN_DELAY_MS = 400;
const SAFETY_SCAN_MS = 20_000;
/** A subtree larger than this (page content arriving) is left to the idle full scan. */
const QUICK_SCAN_LIMIT = 400;

const logger = new Logger("NoWatermark", "#a6e3a1");

let findings: Finding[] = [];
let lastScan: { at: number; elements: number } | null = null;
let revealing = false;
let notified = false;
let observer: MutationObserver | null = null;
let fullTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setInterval> | null = null;
let frame = 0;
const pending = new Set<Element>();
let refreshView: (() => void) | null = null;

export const settings = definePluginSettings({
    notify: {
        type: OptionType.BOOLEAN,
        description: "发现并隐藏水印时提示一次",
        default: true,
    },
    report: {
        type: OptionType.COMPONENT,
        description: "本页检测",
        render: () => renderReport(),
    },
});

const sameFinding = (a: Finding, b: Finding) => a.el === b.el && a.pseudo === b.pseudo && a.part === b.part;

/** Rewrites the rules: selectors are child paths, so they are rebuilt whenever the page's tree may have shifted. */
function writeStyle() {
    findings = findings.filter(finding => finding.el.isConnected);
    registerStyle(STYLE, hidingCss(findings));
    if (revealing) disableStyle(STYLE);
    refreshView?.();
}

function report(fresh: Finding[]) {
    for (const finding of fresh) logger.info(`已隐藏 ${describe(finding.el)}${finding.pseudo}：${finding.reasons.join("、")}`);
    if (!fresh.length || notified || !settings.store.notify) return;
    notified = true;
    showToast(`已隐藏 ${findings.length} 处疑似水印，截图里不会出现（LD++ 设置 → 去除隐藏水印 → 本页检测）`, "info", { key: "no-watermark" });
}

function merge(found: Finding[]) {
    const fresh = found.filter(finding => !findings.some(known => sameFinding(known, finding)));
    if (fresh.length) findings = [...findings, ...fresh];
    writeStyle();
    report(fresh);
}

/**
 * Runs a measurement on the page as the page itself lays it out. LD++'s own rules move what they hide: a filter on a
 * shadow host re-anchors the fixed layer inside it below the page, where it no longer "covers the screen", and the
 * next scan would let it go (and catch it again, over and over). The rules are off only within this synchronous
 * call, so no frame is ever painted without them.
 */
function measured<T>(measure: () => T): T {
    if (!findings.length || revealing) return measure();
    disableStyle(STYLE);
    try {
        return measure();
    } finally {
        enableStyle(STYLE);
    }
}

export function fullScan() {
    if (fullTimer) clearTimeout(fullTimer);
    fullTimer = null;
    if (!document.body) return;
    const found = measured(() => new Detector(currentAccount()).scan(document.documentElement));
    const fresh = found.filter(finding => !findings.some(known => sameFinding(known, finding)));
    findings = found;
    lastScan = { at: Date.now(), elements: document.getElementsByTagName("*").length };
    writeStyle();
    report(fresh);
}

function scheduleFull(delay = FULL_SCAN_DELAY_MS) {
    if (fullTimer) return;
    fullTimer = setTimeout(() => {
        fullTimer = null;
        const idle = (globalThis as { requestIdleCallback?: (fn: () => void, options?: { timeout: number }) => number }).requestIdleCallback;
        if (idle) idle(fullScan, { timeout: 1000 });
        else fullScan();
    }, delay);
}

/** New and restyled boxes, checked before the frame they appear in is painted. */
export function flushPending() {
    frame = 0;
    if (!pending.size) return;
    const detector = new Detector(currentAccount());
    const found: Finding[] = [];
    measured(() => {
        for (const el of pending) {
            if (!el.isConnected) continue;
            if (el.getElementsByTagName("*").length > QUICK_SCAN_LIMIT) {
                const own = detector.check(el);
                if (own) found.push(own);
                scheduleFull();
            } else {
                detector.scan(el, found);
            }
        }
    });
    pending.clear();
    if (found.length) merge(found);
}

function queue(node: Element) {
    // Inside a shadow root, the host is what gets scanned (and hidden): the scan walks into the root from there.
    const el = outerHost(node);
    pending.add(el);
    if (frame) return;
    frame = typeof requestAnimationFrame === "function" && document.visibilityState !== "hidden" ? requestAnimationFrame(flushPending) : (setTimeout(flushPending, 16) as unknown as number);
}

const isStyleSheet = (node: Node) => node instanceof Element && node.matches("style, link[rel~='stylesheet']");

const OBSERVE: MutationObserverInit = { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] };

/** A shadow root the page just created: its contents are invisible to the document's observer, so watch it too. */
function watchRoot(root: ShadowRoot) {
    observer?.observe(root, OBSERVE);
    queue(root.host);
}

function onMutations(records: MutationRecord[]) {
    let treeChanged = false;
    for (const record of records) {
        const target = record.target;
        if (record.type === "childList") {
            if (isOwnNode(target)) continue;
            treeChanged = true;
            // A stylesheet added or rewritten can draw a watermark in a pseudo-element anywhere: look at the whole page.
            if (isStyleSheet(target) || [...record.addedNodes].some(isStyleSheet)) scheduleFull();
            for (const node of record.addedNodes) if (node instanceof Element && !isStyleSheet(node) && !isOwnNode(node)) queue(node);
        } else if (target instanceof Element && !isOwnNode(target)) {
            // Class changes are constant in Discourse; only the page's top boxes can switch a watermark on by class.
            const top = target === document.documentElement || target === document.body || target.parentElement === document.body;
            if (record.attributeName === "style" || top) queue(target);
        }
    }
    if (treeChanged && findings.length) writeStyle();
}

function setRevealing(value: boolean) {
    revealing = value;
    if (value) disableStyle(STYLE);
    else enableStyle(STYLE);
}

function renderReport(): HTMLElement {
    const root = h("div", { class: "ldpp-nwm-report" });
    const render = () => {
        const rows = findings.filter(finding => finding.el.isConnected);
        const scanned = lastScan ? `上次全页检测：${new Date(lastScan.at).toLocaleTimeString()}，检查了 ${lastScan.elements} 个元素。` : "尚未完成全页检测。";
        root.replaceChildren(
            Field("本页隐藏的水印", h("span", { class: "ldpp-field-control ldpp-nwm-summary" }, h("span", null, rows.length ? `${rows.length} 处` : "未发现"), Button("重新检测", { small: true, onClick: () => fullScan() }))),
            rows.length
                ? h("ul", { class: "ldpp-nwm-list" }, rows.map(finding => h("li", null,
                    h("code", null, `${describe(finding.el)}${finding.pseudo}`),
                    h("span", { class: "ldpp-muted" }, `${finding.part === "background" ? "去掉背景" : "整层隐藏"}：${finding.reasons.join("、")}`))))
                : h("p", { class: "ldpp-muted ldpp-nwm-empty" }, "没有找到铺在页面上的水印层。烧进图片里的水印、浏览器指纹不在检测范围内。"),
            Field("临时显示（核对用）", Switch(revealing, value => setRevealing(value), "临时显示")),
            h("p", { class: "ldpp-muted" }, scanned),
        );
    };
    refreshView = () => {
        if (root.isConnected) render();
        else {
            // The settings were closed: stop refreshing, and hide again whatever was shown for checking.
            refreshView = null;
            if (revealing) setRevealing(false);
        }
    };
    render();
    return root;
}

export default definePlugin({
    name: "NoWatermark",
    displayName: "去除隐藏水印",
    description: "找出页面上与账号关联的隐藏水印（铺满屏幕的半透明用户名、平铺的水印图、透明画布等）并用样式藏起来，截图里就不会带上；不删除、不改动网页自己的元素。烧进图片里的水印和浏览器指纹不在此列。",
    tags: ["reading"],
    icon: EraserIcon,
    enabledByDefault: true,
    startAt: StartAt.Init,
    settings,
    start() {
        observer = new MutationObserver(onMutations);
        observer.observe(document.documentElement, OBSERVE);
        hookShadowRoots(watchRoot);
        scheduleFull(0);
        safetyTimer = setInterval(() => {
            refreshView?.();
            if (document.visibilityState !== "hidden") scheduleFull(0);
        }, SAFETY_SCAN_MS);
    },
    stop() {
        observer?.disconnect();
        observer = null;
        unhookShadowRoots();
        if (fullTimer) clearTimeout(fullTimer);
        if (safetyTimer) clearInterval(safetyTimer);
        fullTimer = safetyTimer = null;
        pending.clear();
        findings = [];
        revealing = false;
        unregisterStyle(STYLE);
        refreshView?.();
    },
    events: {
        navigate() {
            notified = false;
            scheduleFull();
        },
    },
});
