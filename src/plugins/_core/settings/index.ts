/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { confirmDialog, type DialogHandle, openDialog } from "@api/Dialog";
import { subscribe } from "@api/Events";
import { isPluginEnabled, plugins, setPluginEnabled } from "@api/PluginManager";
import { registerProcessor } from "@api/TopicList";
import { definePluginSettings } from "@api/Settings";
import { Button, Hint, IconButton, InfoTip, SubTabs, Switch, Tabs } from "@components/controls";
import { BellIcon, BotIcon, CircleAlertIcon, BracesIcon, DatabaseIcon, InfoIcon, PaletteIcon, PinFilledIcon, PinIcon, PluginIcon, RefreshIcon, SettingsIcon, SlidersIcon, StarFilledIcon, StarIcon, TriangleAlertIcon } from "@components/icons";
import { classes } from "@utils/css";
import { h, mark, trackScrollbar } from "@utils/dom";
import { gmMenu } from "@utils/gm";
import definePlugin, { OptionType, type Plugin, type PluginTag, type SettingDef, StartAt } from "@utils/types";

import { previewToasts } from "../notifications";
import { renderProfileEditor } from "../ai";
import { renderQuickCssTab, renderThemesTab } from "../userStyles/ui";
import { renderDataPanel } from "./data";
import { renderSettingsForm } from "./form";

let dialog: DialogHandle | null = null;

export const settings = definePluginSettings({
    starred: {
        type: OptionType.CUSTOM,
        default: [] as string[],
    },
    pinned: {
        type: OptionType.CUSTOM,
        default: [] as string[],
    },
    /** When each plugin was first seen (ms), for the 「新」 badge. */
    knownPlugins: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, number>,
    },
});

type Category = "favorites" | "recent" | "all" | PluginTag;
type ListFilter = "all" | "enabled" | "disabled";

const TAG_LABEL: Partial<Record<PluginTag, string>> = { topics: "话题列表", reading: "阅读", ai: "AI", search: "搜索", sync: "同步" };
const FILTERS: Array<{ value: ListFilter; label: string }> = [
    { value: "all", label: "全部" },
    { value: "enabled", label: "已启用" },
    { value: "disabled", label: "未启用" },
];

// Void++'s windows: 「最新」 lists what changed in the last week, the 「新」 badge marks what arrived in the last two days.
const RECENT_TTL = 7 * 24 * 60 * 60 * 1000;
const NEW_PLUGIN_TTL = 2 * 24 * 60 * 60 * 1000;

const isRecentlyUpdated = (plugin: Plugin) => plugin.updatedAt != null && plugin.updatedAt > 0 && Date.now() - plugin.updatedAt < RECENT_TTL;

function isNewPlugin(name: string): boolean {
    const seen = settings.store.knownPlugins?.[name];
    return seen != null && Date.now() - seen < NEW_PLUGIN_TTL;
}

function trackNewPlugins() {
    const known = { ...settings.store.knownPlugins };
    let changed = false;
    for (const plugin of Object.values(plugins)) {
        if (plugin.hidden || plugin.required || plugin.name in known) continue;
        known[plugin.name] = Date.now();
        changed = true;
    }
    if (changed) settings.store.knownPlugins = known;
}

const listOf = (key: "starred" | "pinned"): string[] => Array.isArray(settings.store[key]) ? settings.store[key] : [];
const toggleIn = (key: "starred" | "pinned", name: string) => {
    const list = listOf(key);
    settings.store[key] = list.includes(name) ? list.filter(item => item !== name) : [...list, name];
};

/** Settings shown in a plugin's dialog: everything except hidden and CUSTOM (stored-only) entries. */
function visibleSettings(plugin: Plugin): Array<[string, SettingDef]> {
    return Object.entries((plugin.settings?.def ?? {}) as Record<string, SettingDef>).filter(([, def]) => !def.hidden && def.type !== OptionType.CUSTOM);
}

/**
 * A plugin with a big editor (屏蔽规则, 提示词, …) and ordinary settings gets one tab per editor plus 「常规」, in the
 * order the settings are defined, so the dialog shows one part at a time instead of one long scroll.
 */
function renderPluginSettings(plugin: Plugin): HTMLElement {
    const entries = visibleSettings(plugin);
    const editors = entries.filter(([, def]) => def.type === OptionType.COMPONENT);
    const ordinary = entries.filter(([, def]) => def.type !== OptionType.COMPONENT);
    if (!editors.length || !ordinary.length) return renderSettingsForm(plugin) ?? h("p", { class: "ldpp-muted" }, "该功能没有可调整的设置。");
    const tabs: Array<{ label: () => string; render: () => HTMLElement }> = [];
    let generalAdded = false;
    for (const [key, def] of entries) {
        if (def.type === OptionType.COMPONENT) {
            tabs.push({ label: () => def.description ?? key, render: () => renderSettingsForm(plugin, other => other === key) ?? h("div") });
        } else if (!generalAdded) {
            generalAdded = true;
            tabs.push({ label: () => "常规", render: () => renderSettingsForm(plugin, (_, other) => other.type !== OptionType.COMPONENT) ?? h("div") });
        }
    }
    return SubTabs(tabs).el;
}

function openPluginDialog(plugin: Plugin) {
    const list = h("div", { class: "ldpp-plugin-dialog-settings" });
    const render = () => list.replaceChildren(renderPluginSettings(plugin));
    render();
    const resettable = visibleSettings(plugin).filter(([, def]) => def.type !== OptionType.COMPONENT).map(([key]) => key);
    openDialog({
        title: plugin.displayName,
        icon: plugin.icon?.(18),
        // Same box as the settings dialog, which it replaces until 「返回设置」: a slightly smaller dialog left a 48–64px
        // rim of the settings page (cut-off cards and switches) around it.
        size: "large",
        back: "返回设置",
        className: "ldpp-plugin-dialog",
        body: [
            h("p", { class: "ldpp-plugin-dialog-desc" }, plugin.description),
            h("h3", { class: "ldpp-plugin-dialog-label" }, "设置"),
            list,
        ],
        actions: resettable.length ? [{
            label: "重置",
            onClick: async () => {
                if (!await confirmDialog(`把「${plugin.displayName}」的设置恢复为默认值？此操作不可撤销。`, { title: "重置设置", danger: true, icon: RefreshIcon(18), okLabel: "重置" })) return false;
                for (const key of resettable) plugin.settings?.reset(key);
                render();
                return false;
            },
        }] : [],
    });
}

function iconToggle(on: boolean, icons: [() => SVGElement, () => SVGElement], labels: [string, string], className: string, onClick: () => void): HTMLButtonElement {
    return IconButton(on ? icons[1]() : icons[0](), { title: on ? labels[1] : labels[0], className: classes("ldpp-row-btn", className, on && "is-on"), onClick });
}

function pluginCard(plugin: Plugin, rerender: () => void): HTMLElement {
    const starred = listOf("starred").includes(plugin.name);
    const pinned = listOf("pinned").includes(plugin.name);
    const enabled = isPluginEnabled(plugin.name);
    const { required } = plugin;
    const crashed = enabled && !plugin.started && !required;
    const tags = (plugin.tags ?? []).map(tag => TAG_LABEL[tag]).filter(Boolean);
    const card = h("article", { class: classes("ldpp-plugin-card", !enabled && "is-off", crashed && "is-crashed", required && "is-required"), dataset: { plugin: plugin.name } },
        h("div", { class: "ldpp-plugin-card-body" },
            h("div", { class: "ldpp-plugin-card-head" },
                h("div", { class: "ldpp-plugin-card-name" },
                    h("span", { class: "ldpp-plugin-card-icon" }, plugin.icon?.(14) ?? PluginIcon(14)),
                    h("span", { class: "ldpp-plugin-card-title", title: plugin.displayName }, plugin.displayName),
                    required ? h("span", { class: "ldpp-plugin-card-required", title: "LD++ 运行必需，无法关闭", attrs: { "aria-label": "LD++ 运行必需，无法关闭" } }, CircleAlertIcon(14)) : null,
                    crashed ? h("span", { class: "ldpp-plugin-card-crashed", title: "该功能启动失败", attrs: { "aria-label": "该功能启动失败" } }, TriangleAlertIcon(14)) : null,
                    isNewPlugin(plugin.name) ? h("span", { class: "ldpp-plugin-card-new" }, "新") : null,
                ),
                h("div", { class: "ldpp-plugin-card-controls" },
                    iconToggle(starred, [StarIcon, StarFilledIcon], ["收藏", "取消收藏"], "ldpp-plugin-star", () => { toggleIn("starred", plugin.name); rerender(); }),
                    required ? null : iconToggle(pinned, [PinIcon, PinFilledIcon], ["置顶", "取消置顶"], "ldpp-plugin-pin", () => { toggleIn("pinned", plugin.name); rerender(); }),
                    visibleSettings(plugin).length ? IconButton(SlidersIcon(), { title: "设置", className: "ldpp-row-btn ldpp-plugin-config", onClick: () => openPluginDialog(plugin) }) : null,
                    Switch(enabled, value => setPluginEnabled(plugin.name, value), plugin.displayName, required),
                ),
            ),
            h("p", { class: "ldpp-plugin-card-desc", title: plugin.description }, plugin.description),
        ),
        h("div", { class: "ldpp-plugin-card-footer" }, tags.join(" · ") || "\u00A0"),
    );
    return card;
}

function renderFeatures(focus?: string): HTMLElement {
    // Required plugins (通知, …) can't be switched off; as in Void++, 「全部」 lists them below the others and every
    // other tab mixes them in.
    const shown = Object.values(plugins).filter(plugin => !plugin.hidden).toSorted((a, b) => a.displayName.localeCompare(b.displayName, "zh"));
    const optional = shown.filter(plugin => !plugin.required);
    const required = shown.filter(plugin => plugin.required);
    const tagTabs = (Object.keys(TAG_LABEL) as PluginTag[]).filter(tag => shown.some(plugin => plugin.tags?.includes(tag)));
    const tabs: Array<{ id: Category; label: string }> = [{ id: "favorites", label: "收藏" }, { id: "recent", label: "最新" }, { id: "all", label: "全部" }, ...tagTabs.map(tag => ({ id: tag, label: TAG_LABEL[tag] ?? tag }))];
    let category: Category = focus || !listOf("starred").length ? "all" : "favorites";
    let filter: ListFilter = "all";
    let query = "";

    const tabBar = h("div", { class: "ldpp-plugins-tabs", attrs: { role: "tablist" } });
    const search = h("input", { type: "search", class: "ldpp-input ldpp-plugins-search" });
    const select = h("select", { class: "ldpp-input ldpp-plugins-filter" }, FILTERS.map(option => h("option", { value: option.value }, option.label)));
    const grid = trackScrollbar(h("div", { class: "ldpp-plugins-grid" }));

    // The tab's list before the search, which the search box counts, as in Void++.
    const inTab = (): [Plugin[], Plugin[]] => {
        const starred = listOf("starred");
        let [list, below] = category === "favorites" ? [starred.map(name => shown.find(plugin => plugin.name === name)).filter((plugin): plugin is Plugin => Boolean(plugin)), []]
            : category === "recent" ? [shown.filter(isRecentlyUpdated).toSorted((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0) || a.displayName.localeCompare(b.displayName, "zh")), []]
                : category === "all" ? [optional, required]
                    : [shown.filter(plugin => plugin.tags?.includes(category as PluginTag)), []];
        if (filter !== "all") {
            const keep = (plugin: Plugin) => isPluginEnabled(plugin.name) === (filter === "enabled");
            [list, below] = [list.filter(keep), below.filter(keep)];
        }
        return [list, below];
    };
    const visible = (tabList: Plugin[]) => {
        const pinned = listOf("pinned");
        const needle = query.trim().toLowerCase();
        let list = tabList;
        if (needle) list = list.filter(plugin => `${plugin.displayName} ${plugin.name} ${plugin.description}`.toLowerCase().includes(needle));
        // 「最新」 keeps its newest-first order; 「收藏」 keeps the order things were starred.
        if (category !== "favorites" && category !== "recent" && pinned.length) {
            const rank = (plugin: Plugin) => { const index = pinned.indexOf(plugin.name); return index < 0 ? Infinity : index; };
            list = list.toSorted((a, b) => rank(a) - rank(b));
        }
        return list;
    };
    const render = () => {
        tabBar.replaceChildren(...tabs.map(tab => h("button", {
            type: "button",
            class: classes("ldpp-plugins-tab", tab.id === category && "is-active"),
            attrs: { role: "tab", "aria-selected": String(tab.id === category) },
            on: { click: () => { category = tab.id; render(); } },
        }, tab.label)));
        const [tabList, tabBelow] = inTab();
        search.placeholder = `搜索 ${tabList.length + tabBelow.length} 个功能…`;
        const list = visible(tabList);
        const below = visible(tabBelow);
        grid.replaceChildren(...list.map(plugin => pluginCard(plugin, render)));
        if (below.length) {
            if (list.length) grid.append(h("hr", { class: "ldpp-plugins-separator" }));
            grid.append(...below.map(plugin => pluginCard(plugin, render)));
        }
        if (!list.length && !below.length) {
            grid.append(h("p", { class: "ldpp-muted ldpp-plugins-empty" },
                query ? "没有匹配的功能。" : category === "favorites" ? "还没有收藏。点功能卡片上的 ☆ 收藏后会显示在这里。"
                    : category === "recent" ? "最近 7 天没有更新的功能。" : "没有功能。"));
        }
    };
    search.addEventListener("input", () => { query = search.value; render(); });
    select.addEventListener("change", () => { filter = select.value as ListFilter; render(); });
    render();
    if (focus && plugins[focus]) requestAnimationFrame(() => openPluginDialog(plugins[focus]));
    return h("div", { class: "ldpp-plugins" }, tabBar, h("div", { class: "ldpp-plugins-toolbar" }, search, select), grid);
}

function renderNotifications(): HTMLElement {
    return h("div", null, renderSettingsForm(plugins.Notifications) ?? Hint("无设置"), h("div", { class: "ldpp-row-actions" }, Button("预览通知", { onClick: previewToasts })));
}

function renderAbout(): HTMLElement {
    return h("div", { class: "ldpp-about" },
        h("h3", null, `LD++ ${VERSION}`, InfoTip("请不要同时启用旧版「屏蔽脚本」与「总结脚本」：LD++ 已包含它们的全部功能，同时启用会重复处理话题列表。旧脚本的数据可在「数据」页导入。", { label: "注意", warning: true })),
        h("p", null, "LINUX DO 增强脚本：话题屏蔽、搜索过滤、话题 / 列表 AI 总结与追问、DeArrow 标题党改写、Google Drive 同步。"),
        h("p", { class: "ldpp-muted" }, `构建：${GIT_HASH}`),
    );
}

export function openSettings(tab = "features", plugin?: string) {
    dialog?.close();
    const tabs = Tabs([
        { id: "features", label: "功能", icon: PluginIcon, render: () => renderFeatures(plugin) },
        { id: "themes", label: "主题", icon: PaletteIcon, render: renderThemesTab },
        { id: "css", label: "快速 CSS", icon: BracesIcon, render: renderQuickCssTab },
        { id: "ai", label: "AI 接口", icon: BotIcon, render: renderProfileEditor },
        { id: "notifications", label: "通知", icon: BellIcon, render: renderNotifications },
        { id: "data", label: "数据", icon: DatabaseIcon, render: renderDataPanel },
        { id: "about", label: "关于", icon: InfoIcon, render: renderAbout },
    ], { initial: tab, vertical: true });
    dialog = openDialog({
        title: "LD++ 设置",
        icon: SettingsIcon(18),
        info: "开关和设置都立即生效，无需刷新页面。所有功能共用一套话题列表处理流程，彼此不会互相干扰。",
        size: "large",
        className: "ldpp-settings",
        body: h("div", { class: "ldpp-settings-layout" }, h("nav", { class: "ldpp-settings-nav" }, tabs.list), h("div", { class: "ldpp-settings-main" }, tabs.panel)),
        onClose: () => { dialog = null; },
    });
}

function ensureHeaderButton() {
    if (document.querySelector(".ldpp-header-item")) return;
    const icons = document.querySelector(".d-header-icons");
    if (!icons) return;
    const button = h("button", { type: "button", class: "icon btn btn-flat ldpp-header-button", title: "LD++ 设置", attrs: { "aria-label": "LD++ 设置" }, on: { click: () => openSettings() } }, SettingsIcon(18));
    icons.prepend(mark(h("li", { class: "header-dropdown-toggle ldpp-header-item" }, button), "header"));
}

export default definePlugin({
    name: "Settings",
    displayName: "设置",
    description: "LD++ 设置面板。",
    tags: ["core"],
    required: true,
    hidden: true,
    settings,
    startAt: StartAt.DOMContentLoaded,
    start() {
        trackNewPlugins();
        gmMenu("⚙️ LD++ 设置", () => openSettings());
        subscribe("openSettings", ({ tab, plugin }) => openSettings(tab, plugin));
        ensureHeaderButton();
        registerProcessor({ id: "header-button", run: ensureHeaderButton });
    },
    events: {
        pluginToggle({ name, enabled }) {
            const card = dialog?.root.querySelector<HTMLElement>(`.ldpp-plugin-card[data-plugin="${CSS.escape(name)}"]`);
            const input = card?.querySelector<HTMLInputElement>(".ldpp-plugin-card-controls input[type=checkbox]");
            if (!card || !input) return;
            input.checked = enabled;
            card.classList.toggle("is-off", !enabled);
        },
    },
});
