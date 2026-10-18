/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The 「主题」 and 「快速 CSS」 settings tabs, after Void++'s Themes and Quick CSS tabs.

import { confirmDialog, openDialog } from "@api/Dialog";
import { showToast } from "@api/Notifications";
import { Button, Field, IconButton, InfoTip, NumberInput, Select, Switch, TextInput } from "@components/controls";
import { CopyIcon, FolderIcon, GlobeIcon, LinkIcon, PaletteIcon, PencilIcon, PlusIcon, RefreshIcon, SlidersIcon, TrashIcon, UploadIcon } from "@components/icons";
import { classes } from "@utils/css";
import { h, trackScrollbar } from "@utils/dom";
import { copyText, debounce, errorMessage, isAbortError, pickFiles } from "@utils/misc";

import { CssEditor } from "./cssEditor";
import { buildStyle, fetchStyleSource, getStyle, installStyle, listStyles, plain, recompile, removeStyle, settings, setQuickCss, setQuickCssEnabled, updateStyle, type UserStyle } from "./index";
import { appliesToSite, type BackupStyle, colorToRgb, hasUserCssMeta, readStylusBackup, sectionsToSource, SUPPORTED_PREPROCESSORS, type UserCssVar, varValue } from "./usercss";

type ThemeFilter = "all" | "enabled" | "disabled" | "online" | "local";

const FILTERS: Array<{ value: ThemeFilter; label: string }> = [
    { value: "all", label: "全部" },
    { value: "enabled", label: "已启用" },
    { value: "disabled", label: "未启用" },
    { value: "online", label: "在线" },
    { value: "local", label: "本地" },
];

const IMPORT_ACCEPT = ".css,.styl,.json,text/css,application/json";

const configurable = (style: UserStyle) => Object.keys(style.vars).length > 0 && SUPPORTED_PREPROCESSORS.has(style.preprocessor) && hasUserCssMeta(style.source);

function report(added: number, updated: number, problems: string[]) {
    const done = [added && `新增 ${added} 个`, updated && `更新 ${updated} 个`].filter(Boolean).join("，");
    if (done) showToast(`已导入主题：${done}`, "success");
    for (const problem of problems) showToast(problem, "error");
}

/** Imports one style, checking that it does something on linux.do. Returns what happened. */
function importOne(style: UserStyle, problems: string[]): "added" | "updated" | null {
    if (!appliesToSite(style.sections)) {
        problems.push(`「${style.name}」不作用于 linux.do，已跳过`);
        return null;
    }
    return installStyle(style);
}

/** A Stylus backup entry as an LD++ style: UserCSS styles keep their source and variable choices; classic ones and
 *  stylus/less ones (which need a compiler) are taken from the backup's already-compiled sections. */
function fromBackup(entry: BackupStyle): UserStyle {
    if (entry.sourceCode && SUPPORTED_PREPROCESSORS.has(entry.preprocessor ?? "") && hasUserCssMeta(entry.sourceCode)) {
        return buildStyle({ source: entry.sourceCode, vars: entry.vars, enabled: entry.enabled });
    }
    return buildStyle({ source: sectionsToSource(entry.sections), name: entry.name, author: entry.author, description: entry.description, enabled: entry.enabled });
}

/** Scoped by @-moz-document somewhere; a style with only unscoped code applies to every site in Stylus. */
const isScoped = (entry: BackupStyle) => entry.sections.some(section => section.domains || section.urlPrefixes || section.urls || section.regexps);

function openBackupPicker(entries: BackupStyle[], rerender: () => void) {
    const chosen = new Set(entries.filter(isScoped));
    const row = (entry: BackupStyle) => {
        const input = h("input", { type: "checkbox", checked: chosen.has(entry) });
        input.addEventListener("change", () => { if (input.checked) chosen.add(entry); else chosen.delete(entry); });
        const global = !isScoped(entry);
        const kind = entry.preprocessor ? `UserCSS · ${entry.preprocessor}` : "经典样式";
        return h("li", null, h("label", { class: "ldpp-check" }, input,
            h("span", { class: "ldpp-backup-name" }, entry.name),
            h("span", { class: "ldpp-muted" }, global ? `${kind} · 全局（作用于所有网站）` : kind)));
    };
    openDialog({
        title: "从 Stylus 备份导入",
        icon: UploadIcon(18),
        info: "列出备份中作用于 linux.do 的样式。全局样式（没有 @-moz-document 限定）在 Stylus 里对所有网站生效，默认不勾选。使用 stylus / less 预处理器的样式按备份里已编译的结果导入，变量不能再调整。",
        size: "medium",
        body: h("ul", { class: "ldpp-backup-list" }, entries.map(row)),
        actions: [
            { label: "取消" },
            {
                label: "导入所选",
                kind: "primary",
                onClick: () => {
                    let added = 0, updated = 0;
                    const problems: string[] = [];
                    for (const entry of chosen) {
                        try {
                            const result = importOne(fromBackup(entry), problems);
                            if (result === "added") added++;
                            else if (result === "updated") updated++;
                        } catch (error) {
                            problems.push(`「${entry.name}」导入失败：${errorMessage(error)}`);
                        }
                    }
                    report(added, updated, problems);
                    rerender();
                },
            },
        ],
    });
}

async function importFiles(rerender: () => void) {
    let files: File[];
    try {
        files = await pickFiles(IMPORT_ACCEPT, true);
    } catch (error) {
        if (!isAbortError(error)) showToast(errorMessage(error), "error");
        return;
    }
    let added = 0, updated = 0;
    const problems: string[] = [];
    for (const file of files) {
        const text = await file.text();
        try {
            if (/\.json$/i.test(file.name) || /^\s*[[{]/.test(text)) {
                const backup = readStylusBackup(JSON.parse(text));
                if (!backup) throw new Error("不是 Stylus 备份文件");
                const relevant = backup.filter(entry => appliesToSite(entry.sections));
                if (!relevant.length) throw new Error(`备份中的 ${backup.length} 个样式都不作用于 linux.do`);
                openBackupPicker(relevant, rerender);
                continue;
            }
            const style = buildStyle({ source: text, name: file.name.replace(/(\.user)?\.(css|styl)$/i, "") });
            const result = importOne(style, problems);
            if (result === "added") added++;
            else if (result === "updated") updated++;
        } catch (error) {
            problems.push(`「${file.name}」导入失败：${errorMessage(error)}`);
        }
    }
    report(added, updated, problems);
    rerender();
}

function openUrlDialog(rerender: () => void) {
    const error = h("p", { class: "ldpp-field-error" });
    let url = "";
    const input = TextInput({ value: "", placeholder: "https://…/样式.user.css", onInput: value => { url = value.trim(); } });
    openDialog({
        title: "从网址安装",
        icon: LinkIcon(18),
        info: "支持 userstyles.world、Greasy Fork、GitHub 等处的 .user.css 链接。安装后每天自动检查一次更新，变量的选择会保留。",
        size: "medium",
        body: h("div", { class: "ldpp-theme-url" }, Field("样式网址", h("span", { class: "ldpp-field-control ldpp-field-wide" }, input, error))),
        actions: [
            { label: "取消" },
            {
                label: "安装",
                kind: "primary",
                onClick: async () => {
                    error.textContent = "";
                    if (!/^https?:\/\//i.test(url)) {
                        error.textContent = "请输入以 http(s):// 开头的网址";
                        return false;
                    }
                    try {
                        const source = await fetchStyleSource(url);
                        const style = buildStyle({ source, origin: "online", url, name: url.split("/").pop()?.replace(/(\.user)?\.css.*$/i, "") });
                        const problems: string[] = [];
                        const result = importOne(style, problems);
                        if (!result) throw new Error(problems[0]);
                        showToast(`${result === "added" ? "已安装" : "已更新"}主题「${style.name}」`, "success");
                        rerender();
                        return true;
                    } catch (failure) {
                        error.textContent = errorMessage(failure);
                        return false;
                    }
                },
            },
        ],
    });
}

function openEditDialog(style: UserStyle | null, rerender: () => void) {
    let source = style?.source ?? "";
    let name = style?.name ?? "";
    const error = h("p", { class: "ldpp-field-error" });
    const nameField = Field("名称", h("span", { class: "ldpp-field-control ldpp-field-wide" }, TextInput({ value: name, placeholder: "新主题", onInput: value => { name = value; } })));
    const syncName = () => { nameField.hidden = hasUserCssMeta(source); };
    const editor = CssEditor({
        value: source,
        placeholder: "在这里写 CSS，不写 @-moz-document 时作用于 linux.do 全站。\n也可以粘贴 Stylus 的 UserCSS（==UserStyle== 元数据、@var 变量）。",
        onChange: value => { source = value; syncName(); },
    });
    syncName();
    openDialog({
        title: style ? `编辑主题「${style.name}」` : "新建主题",
        icon: PencilIcon(18),
        info: "支持 Stylus 的 UserCSS 格式：==UserStyle== 元数据（有 @name 时以它为名称）、@var 变量（预处理器 default / uso）、@-moz-document 限定范围。",
        back: "返回设置",
        size: "large",
        className: "ldpp-theme-edit",
        body: [nameField, error, editor.el],
        actions: [
            { label: "取消" },
            {
                label: "保存",
                kind: "primary",
                onClick: () => {
                    error.textContent = "";
                    try {
                        const built = buildStyle({ source, name: name.trim() || "新主题", previous: style ?? undefined });
                        if (style) updateStyle(style.id, built);
                        else installStyle(built);
                        rerender();
                        return true;
                    } catch (failure) {
                        error.textContent = errorMessage(failure);
                        return false;
                    }
                },
            },
        ],
    });
    requestAnimationFrame(() => editor.textarea.focus());
}

function toHex(value: string): string {
    const rgb = colorToRgb(value);
    return rgb ? `#${rgb.split(",").map(part => Number(part).toString(16).padStart(2, "0")).join("")}` : "#000000";
}

function varControl(variable: UserCssVar, set: (value: string | number | null) => void): HTMLElement {
    const current = String(variable.value ?? variable.default);
    switch (variable.type) {
        case "select":
        case "dropdown":
        case "image":
            return Select(current, (variable.options ?? []).map(option => ({ label: option.label, value: option.name })), set);
        case "checkbox":
            return Switch(current === "1", on => set(on ? "1" : "0"), variable.label);
        case "number":
        case "range":
            return NumberInput({ value: Number(current), min: variable.min, max: variable.max, step: variable.step, unit: variable.units, onChange: set });
        case "color": {
            const picker = h("input", { type: "color", class: "ldpp-color-swatch", value: toHex(current), title: "选择颜色" });
            const text = TextInput({ value: current, onInput: value => { picker.value = toHex(value); set(value); } }) as HTMLInputElement;
            picker.addEventListener("input", () => { text.value = picker.value; set(picker.value); });
            return h("span", { class: "ldpp-color-field" }, picker, text);
        }
        default:
            return TextInput({ value: current, onInput: set });
    }
}

function openVarsDialog(style: UserStyle, rerender: () => void) {
    let vars: Record<string, UserCssVar> = plain(style.vars);
    const apply = debounce(() => {
        const current = getStyle(style.id);
        if (!current) return;
        try {
            updateStyle(style.id, recompile(current, vars));
        } catch (error) {
            showToast(`「${style.name}」编译失败：${errorMessage(error)}`, "error");
        }
    }, 250);
    const list = h("div", { class: "ldpp-settings-form ldpp-theme-vars" });
    const render = () => list.replaceChildren(...Object.values(vars).map(variable => {
        const field = Field(variable.label, h("span", { class: classes("ldpp-theme-var-control", variable.type === "checkbox" && "is-switch") }, varControl(variable, value => {
            vars[variable.name] = { ...vars[variable.name], value };
            apply();
        })));
        field.title = `${variable.name} = ${varValue(variable)}`;
        return field;
    }));
    render();
    openDialog({
        title: style.name,
        icon: PaletteIcon(18),
        back: "返回设置",
        size: "large",
        className: "ldpp-plugin-dialog",
        body: [
            style.description ? h("p", { class: "ldpp-plugin-dialog-desc" }, style.description) : null,
            h("h3", { class: "ldpp-plugin-dialog-label" }, `变量（${Object.keys(vars).length}）`),
            list,
        ],
        actions: [{
            label: "恢复默认",
            onClick: async () => {
                if (!await confirmDialog(`把「${style.name}」的全部变量恢复为默认值？`, { title: "恢复默认变量", danger: true, icon: RefreshIcon(18), okLabel: "恢复" })) return false;
                vars = Object.fromEntries(Object.entries(vars).map(([name, variable]) => [name, { ...variable, value: null }]));
                render();
                apply();
                return false;
            },
        }],
        onClose: rerender,
    });
}

function themeCard(style: UserStyle, rerender: () => void): HTMLElement {
    const online = style.origin === "online";
    const meta = [style.author, style.version && `v${style.version}`].filter(Boolean).join(" · ");
    return h("article", { class: classes("ldpp-plugin-card", "ldpp-theme-card", !style.enabled && "is-off"), dataset: { style: style.id } },
        h("div", { class: "ldpp-plugin-card-body" },
            h("div", { class: "ldpp-plugin-card-head" },
                h("div", { class: "ldpp-plugin-card-name" },
                    h("span", { class: "ldpp-plugin-card-icon" }, PaletteIcon(14)),
                    h("span", { class: "ldpp-plugin-card-title", title: style.name }, style.name),
                ),
                h("div", { class: "ldpp-plugin-card-controls" },
                    configurable(style) ? IconButton(SlidersIcon(), { title: "变量", className: "ldpp-row-btn", onClick: () => openVarsDialog(style, rerender) }) : null,
                    online
                        ? IconButton(CopyIcon(), { title: "复制网址", className: "ldpp-row-btn", onClick: () => void copyText(style.url ?? "").then(() => showToast("已复制网址", "success")) })
                        : IconButton(PencilIcon(), { title: "编辑", className: "ldpp-row-btn", onClick: () => openEditDialog(style, rerender) }),
                    IconButton(TrashIcon(), {
                        title: "删除",
                        className: "ldpp-row-btn ldpp-theme-remove",
                        onClick: async () => {
                            if (!await confirmDialog(`确定删除主题「${style.name}」吗？`, { title: "删除主题", danger: true, okLabel: "删除" })) return;
                            removeStyle(style.id);
                            rerender();
                        },
                    }),
                    Switch(style.enabled, value => { updateStyle(style.id, { enabled: value }); rerender(); }, style.name),
                ),
            ),
            h("p", { class: "ldpp-plugin-card-desc", title: style.description ?? "" }, style.description ?? " "),
        ),
        h("div", { class: "ldpp-plugin-card-footer ldpp-theme-card-footer" },
            online ? GlobeIcon(12) : FolderIcon(12),
            h("span", null, meta || (online ? "在线主题" : "本地主题")),
        ),
    );
}

export function renderThemesTab(): HTMLElement {
    let query = "";
    let filter: ThemeFilter = "all";
    const root = h("div", { class: "ldpp-themes" });
    const grid = trackScrollbar(h("div", { class: "ldpp-plugins-grid" }));
    const search = h("input", { type: "search", class: "ldpp-input ldpp-plugins-search" });
    const select = h("select", { class: "ldpp-input ldpp-plugins-filter" }, FILTERS.map(option => h("option", { value: option.value }, option.label)));
    const toolbar = h("div", { class: "ldpp-plugins-toolbar" }, search, select);
    const rerender = () => {
        const all = listStyles();
        search.placeholder = `搜索 ${all.length} 个主题…`;
        toolbar.hidden = !all.length;
        const needle = query.trim().toLowerCase();
        const visible = all.filter(style => (filter === "all"
            || (filter === "enabled" && style.enabled) || (filter === "disabled" && !style.enabled)
            || (filter === "online" && style.origin === "online") || (filter === "local" && style.origin === "local"))
            && (!needle || `${style.name} ${style.description ?? ""} ${style.author ?? ""}`.toLowerCase().includes(needle)));
        grid.replaceChildren(...visible.map(style => themeCard(style, rerender)));
        if (!visible.length) grid.append(h("p", { class: "ldpp-muted ldpp-plugins-empty" }, all.length ? "没有匹配的主题。" : "还没有主题。可以从网址安装，或导入 Stylus 样式。"));
    };
    search.addEventListener("input", () => { query = search.value; rerender(); });
    select.addEventListener("change", () => { filter = select.value as ThemeFilter; rerender(); });
    root.append(
        h("div", { class: "ldpp-themes-row" },
            h("span", { class: "ldpp-field-label" }, "在线主题", InfoTip("从网址安装 Stylus 样式（.user.css），每天自动检查一次更新。")),
            Button("从网址安装", { icon: LinkIcon(), onClick: () => openUrlDialog(rerender) }),
        ),
        h("div", { class: "ldpp-themes-row" },
            h("span", { class: "ldpp-field-label" }, "本地主题", InfoTip("导入 Stylus 的 .user.css 文件（可多选），或 Stylus「备份」导出的 JSON（会列出其中作用于 linux.do 的样式）；也可以新建空白主题直接写 CSS。只保存在本机，「数据」页的备份会包含它们。")),
            h("span", { class: "ldpp-themes-actions" },
                Button("导入 Stylus 样式", { icon: UploadIcon(), onClick: () => void importFiles(rerender) }),
                Button("新建", { icon: PlusIcon(), onClick: () => openEditDialog(null, rerender) }),
            ),
        ),
        toolbar,
        grid,
    );
    rerender();
    return root;
}

export function renderQuickCssTab(): HTMLElement {
    const save = debounce((css: string) => setQuickCss(css), 200);
    const editor = CssEditor({
        value: String(settings.store.quickCss ?? ""),
        placeholder: "在这里写 CSS，输入即生效。例如：\n.d-header { box-shadow: none; }",
        disabled: settings.store.quickCssEnabled === false,
        onChange: save,
    });
    return h("div", { class: "ldpp-quick-css" },
        Field("启用快速 CSS", Switch(settings.store.quickCssEnabled !== false, value => {
            setQuickCssEnabled(value);
            editor.setDisabled(!value);
        }, "启用快速 CSS"), "输入即生效，只保存在本机；关闭后代码保留但不再应用。快速 CSS 排在所有主题之后，可以覆盖它们。"),
        editor.el,
    );
}
