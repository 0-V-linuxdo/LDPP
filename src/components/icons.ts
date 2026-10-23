/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { svg } from "@utils/dom";

type Shape = [string, Record<string, string>];

const STROKE = { fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };

function stroke(...shapes: Shape[]) {
    return (size = 16) => {
        const icon = svg("0 0 24 24", shapes.map(([tag, attrs]) => [tag, { ...STROKE, ...attrs }]), size);
        icon.classList.add("ldpp-icon");
        return icon;
    };
}

function filled(viewBox: string, className: string, shapes: Shape[]) {
    return (size = 16) => {
        const icon = svg(viewBox, shapes, size);
        icon.classList.add("ldpp-icon", className);
        return icon;
    };
}

const path = (d: string): Shape => ["path", { d }];
const circle = (cx: number, cy: number, r: number): Shape => ["circle", { cx: String(cx), cy: String(cy), r: String(r) }];

export const BanIcon = stroke(circle(12, 12, 9), path("M5.6 5.6l12.8 12.8"));
export const EyeIcon = stroke(path("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"), circle(12, 12, 3));
export const EyeOffIcon = stroke(path("M3 3l18 18"), path("M10.6 6.1A9.8 9.8 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9"), path("M6.6 6.7C3.9 8.5 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-.9"), path("M9.9 9.9a3 3 0 0 0 4.2 4.2"));
export const SparkIcon = stroke(path("M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"), path("M19 17v4"), path("M17 19h4"));
export const HistoryIcon = stroke(path("M3 12a9 9 0 1 0 3-6.7L3 8"), path("M3 3v5h5"), path("M12 7v5l3 2"));
const ASK_PATH = { fill: "currentColor", stroke: "currentColor", "stroke-width": "0.5", "stroke-linejoin": "round" };
export const QuestionIcon = filled("0 0 32 32", "ldpp-ask-icon", [
    ["path", { ...ASK_PATH, d: "M17,23h-2v-2h2V23z M17,17.899c2.279-0.464,4-2.485,4-4.899c0-2.757-2.243-5-5-5s-5,2.243-5,5h2c0-1.654,1.346-3,3-3s3,1.346,3,3s-1.346,3-3,3h-1v4h2V17.899z" }],
    ["path", { ...ASK_PATH, d: "M16,2C8.268,2,2,8.268,2,16c0,2.863,0.863,5.522,2.338,7.74L2,29l1,1l5.26-2.338C10.478,29.137,13.137,30,16,30c7.732,0,14-6.268,14-14S23.732,2,16,2z M16,28.923c-2.551,0-5.021-0.746-7.144-2.158l-0.493-0.328l-5.042,2.241l2.241-5.042l-0.328-0.493C3.823,21.021,3.077,18.551,3.077,16C3.077,8.874,8.874,3.077,16,3.077c7.126,0,12.923,5.797,12.923,12.923S23.126,28.923,16,28.923z" }],
]);
export const DeArrowIcon = filled("0 0 36 36", "ldpp-dearrow-icon", [
    ["path", { fill: "#1213BD", d: "M36 18.302c0 4.981-2.46 9.198-5.655 12.462s-7.323 5.152-12.199 5.152-9.764-1.112-12.959-4.376S0 23.283 0 18.302s2.574-9.38 5.769-12.644S13.271 0 18.146 0s9.394 2.178 12.589 5.442C33.931 8.706 36 13.322 36 18.302z" }],
    ["path", { fill: "#88c9f9", d: "m 30.394282,18.410186 c 0,3.468849 -1.143025,6.865475 -3.416513,9.137917 -2.273489,2.272442 -5.670115,2.92874 -9.137918,2.92874 -3.467803,0 -6.373515,-1.147212 -8.6470033,-3.419654 -2.2734888,-2.272442 -3.5871299,-5.178154 -3.5871299,-8.647003 0,-3.46885 0.9420533,-6.746149 3.2144954,-9.0196379 2.2724418,-2.2734888 5.5507878,-3.9513905 9.0196378,-3.9513905 3.46885,0 6.492841,1.9322561 8.76633,4.204698 2.273489,2.2724424 3.788101,5.2974804 3.788101,8.7663304 z" }],
    ["path", { fill: "#0a62a5", d: "m 23.95823,17.818306 c 0,3.153748 -2.644888,5.808102 -5.798635,5.808102 -3.153748,0 -5.599825,-2.654354 -5.599825,-5.808102 0,-3.153747 2.446077,-5.721714 5.599825,-5.721714 3.153747,0 5.798635,2.567967 5.798635,5.721714 z" }],
]);
export const RefreshIcon = stroke(path("M21 12a9 9 0 0 1-15.4 6.4L3 16"), path("M3 21v-5h5"), path("M3 12a9 9 0 0 1 15.4-6.4L21 8"), path("M21 3v5h-5"));
export const CloseIcon = stroke(path("M6 6l12 12"), path("M18 6L6 18"));
export const ChevronLeftIcon = stroke(path("M15 6l-6 6 6 6"));
export const ChevronRightIcon = stroke(path("M9 6l6 6-6 6"));
export const ChevronDownIcon = stroke(path("M6 9l6 6 6-6"));
export const SettingsIcon = stroke(circle(12, 12, 3), path("M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"));
export const CopyIcon = stroke(["rect", { x: "9", y: "9", width: "12", height: "12", rx: "2" }], path("M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"));
export const TrashIcon = stroke(path("M3 6h18"), path("M8 6V4h8v2"), path("M19 6l-1 14H6L5 6"));
export const PlusIcon = stroke(path("M12 5v14"), path("M5 12h14"));
export const CloudIcon = stroke(path("M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.5 12 3.5 3.5 0 0 0 6 19z"));
export const FilterIcon = stroke(path("M3 5h18l-7 8v6l-4 2v-8z"));
export const ShieldIcon = stroke(path("M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"), path("M9 12l2 2 4-4"));
/** Lucide "unplug" — the icon Void++ uses for its Plugins tab. */
export const PluginIcon = stroke(path("m19 5 3-3"), path("m2 22 3-3"), path("M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"), path("M7.5 13.5 10 11"), path("M10.5 16.5 13 14"), path("m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"));
export const DatabaseIcon = stroke(["ellipse", { cx: "12", cy: "5", rx: "8", ry: "3" }], path("M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"), path("M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"));
export const BellIcon = stroke(path("M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"), path("M10.3 21a1.9 1.9 0 0 0 3.4 0"));
/** Lucide "bot". */
export const BotIcon = stroke(path("M12 8V4H8"), ["rect", { x: "4", y: "8", width: "16", height: "12", rx: "2" }], path("M2 14h2"), path("M20 14h2"), path("M15 13v2"), path("M9 13v2"));
/** Lucide "triangle-alert" — a plugin card whose plugin failed to start, as in Void++. */
export const TriangleAlertIcon = stroke(path("m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"), path("M12 9v4"), path("M12 17h.01"));
export const InfoIcon = stroke(circle(12, 12, 9), path("M12 11v5"), path("M12 8h.01"));
export const ListIcon = stroke(path("M8 6h13"), path("M8 12h13"), path("M8 18h13"), path("M3 6h.01"), path("M3 12h.01"), path("M3 18h.01"));
export const SidebarIcon = stroke(["rect", { x: "3", y: "4", width: "18", height: "16", rx: "2" }], path("M15 4v16"));
export const SearchIcon = stroke(circle(11, 11, 7), path("M20 20l-3.5-3.5"));

const STAR = "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.53L12 17.49l-5.87 3.08 1.12-6.53L2.5 9.41l6.56-.95z";
const PIN = "M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z";
export const StarIcon = stroke(path(STAR));
export const StarFilledIcon = stroke(["path", { d: STAR, fill: "currentColor" }]);
export const PinIcon = stroke(path("M12 17v5"), path(PIN));
export const PinFilledIcon = stroke(path("M12 17v5"), ["path", { d: PIN, fill: "currentColor" }]);
/** Two sliders — the per-plugin 「设置」 button, as in Void++. */
export const SlidersIcon = stroke(path("M20 7h-9"), path("M14 17H5"), circle(17, 17, 3), circle(7, 7, 3));
const dot = (cx: number, cy: number): Shape => ["circle", { cx: String(cx), cy: String(cy), r: ".5", fill: "currentColor" }];
/** Lucide "palette" — Void++'s Themes tab. */
export const PaletteIcon = stroke(dot(13.5, 6.5), dot(17.5, 10.5), dot(8.5, 7.5), dot(6.5, 12.5), path("M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.55-2.5 5.55-5.55C21.97 6.01 17.46 2 12 2z"));
/** Lucide "braces" — Void++'s Quick CSS tab. */
export const BracesIcon = stroke(path("M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1"), path("M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1"));
export const PencilIcon = stroke(path("M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"), path("m15 5 4 4"));
export const GlobeIcon = stroke(circle(12, 12, 10), path("M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"), path("M2 12h20"));
export const FolderIcon = stroke(path("M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"));
export const UploadIcon = stroke(path("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"), path("M17 8l-5-5-5 5"), path("M12 3v12"));
export const LinkIcon = stroke(path("M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"), path("M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"));
/** Lucide "panel-left" — the left sidebar (侧边栏宽度). */
export const PanelLeftIcon = stroke(["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }], path("M9 3v18"));
/** Lucide "message-circle" — Void++'s CustomGreeting. */
export const MessageCircleIcon = stroke(path("M7.9 20A9 9 0 1 0 4 16.1L2 22Z"));
/** Lucide "circle-user" — 发布者头像调整. */
export const UserCircleIcon = stroke(circle(12, 12, 10), circle(12, 10, 3), path("M7 20.66V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.66"));
/** Lucide "move-horizontal" — 超宽显示与窄顶栏. */
export const WideIcon = stroke(path("m18 8 4 4-4 4"), path("M2 12h20"), path("m6 8-4 4 4 4"));
/** Lucide "clock" — 话题创建时间. */
export const ClockIcon = stroke(circle(12, 12, 10), path("M12 6v6l4 2"));
/** Lucide "languages" — 中英文混排优化. */
export const LanguagesIcon = stroke(path("m5 8 6 6"), path("m4 14 6-6 2-3"), path("M2 5h12"), path("M7 2h1"), path("m22 22-5-10-5 10"), path("M14 18h6"));
/** Lucide "video-off" — 禁用视频自动播放. */
export const VideoOffIcon = stroke(path("M10.66 6H14a2 2 0 0 1 2 2v2.5l5.25-3.06A.5.5 0 0 1 22 7.87v8.196"), path("M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2"), path("m2 2 20 20"));
/** Lucide "arrow-up" — send in the question composer. */
export const ArrowUpIcon = stroke(path("m5 12 7-7 7 7"), path("M12 19V5"));
/** A filled rounded square — stop a running answer. */
export const StopIcon = stroke(["rect", { x: "6", y: "6", width: "12", height: "12", rx: "2", fill: "currentColor" }]);
/** Lucide "tag" — 关键词搜索增强 (the old script's 🏷️). */
export const TagIcon = stroke(path("M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"), circle(7.5, 7.5, 0.5));
/** Lucide "eraser" — 去除隐藏水印. */
export const EraserIcon = stroke(path("m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"), path("M22 21H7"), path("m5 11 9 9"));
