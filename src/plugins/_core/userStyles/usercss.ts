/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Stylus userstyles: UserCSS sources (`==UserStyle==` metadata, `@var`, `@-moz-document`) and Stylus backup JSON.
// Metadata goes through usercss-meta, the parser Stylus itself uses; compiling and section matching follow Stylus's
// usercss compiler and sections-util so a style renders the same here as in the extension.

import { parse as parseMeta } from "usercss-meta";

export type VarType = "text" | "color" | "checkbox" | "select" | "dropdown" | "image" | "number" | "range";

export interface VarOption {
    name: string;
    label: string;
    value: string;
}

export interface UserCssVar {
    type: VarType;
    name: string;
    label: string;
    /** The user's choice; `null` means the default. For option types this is the option *name*. */
    value: string | number | null;
    default: string | number;
    options: VarOption[] | null;
    min?: number;
    max?: number;
    step?: number;
    units?: string;
}

/** One `@-moz-document` block, in the shape Stylus stores. No conditions at all = applies everywhere. */
export interface StyleSection {
    code: string;
    domains?: string[];
    urlPrefixes?: string[];
    urls?: string[];
    regexps?: string[];
}

export interface StyleMeta {
    name: string;
    namespace?: string;
    version?: string;
    description?: string;
    author?: string;
    homepageURL?: string;
    updateURL?: string;
    preprocessor: string;
    vars: Record<string, UserCssVar>;
}

/** Preprocessors LD++ compiles itself; `stylus` and `less` need their compilers, which a userscript does not ship. */
export const SUPPORTED_PREPROCESSORS = new Set(["default", "uso"]);

const META_BLOCK = /\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//i;

export function hasUserCssMeta(source: string): boolean {
    return META_BLOCK.test(source);
}

function str(value: unknown): string | undefined {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeVar(name: string, raw: Record<string, unknown>): UserCssVar {
    const type = (str(raw.type) ?? "text") as VarType;
    const options = Array.isArray(raw.options)
        ? (raw.options as Array<Record<string, unknown>>).map(option => ({ name: String(option.name ?? ""), label: String(option.label ?? option.name ?? ""), value: String(option.value ?? "") }))
        : null;
    const variable: UserCssVar = {
        type,
        name,
        label: str(raw.label) ?? name,
        value: raw.value == null ? null : raw.value as string | number,
        default: (raw.default ?? "") as string | number,
        options,
    };
    for (const key of ["min", "max", "step"] as const) if (typeof raw[key] === "number") variable[key] = raw[key];
    if (typeof raw.units === "string") variable.units = raw.units;
    return variable;
}

/** Reads the `==UserStyle==` block. Throws with a readable message when it is missing or malformed. */
export function parseUserCss(source: string): StyleMeta {
    const block = source.match(META_BLOCK)?.[0];
    if (!block) throw new Error("没有找到 ==UserStyle== 元数据");
    let metadata: Record<string, unknown>;
    try {
        metadata = parseMeta(block, { mandatoryKeys: ["name"] }).metadata as Record<string, unknown>;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`元数据格式错误：${message}`, { cause: error });
    }
    const vars = Object.fromEntries(Object.entries((metadata.vars ?? {}) as Record<string, Record<string, unknown>>).map(([name, raw]) => [name, normalizeVar(name, raw)]));
    return {
        name: str(metadata.name) ?? "未命名样式",
        namespace: str(metadata.namespace),
        version: str(metadata.version),
        description: str(metadata.description),
        author: str(metadata.author),
        homepageURL: str(metadata.homepageURL),
        updateURL: str(metadata.updateURL),
        preprocessor: str(metadata.preprocessor) ?? "default",
        vars,
    };
}

/** The value a variable contributes to the CSS (Stylus `getVarValue`): option names map to their values, numbers get units. */
export function varValue(variable: UserCssVar): string {
    const chosen = variable.value ?? variable.default;
    if (variable.options) {
        const option = variable.options.find(item => item.name === String(chosen)) ?? variable.options[0];
        return option?.value ?? "";
    }
    if (variable.type === "number" || variable.type === "range") return `${chosen}${variable.units ?? ""}`;
    return String(chosen ?? "");
}

const NAMED_COLORS: Record<string, string> = { black: "0, 0, 0", white: "255, 255, 255", red: "255, 0, 0", green: "0, 128, 0", blue: "0, 0, 255", gray: "128, 128, 128", grey: "128, 128, 128", yellow: "255, 255, 0", orange: "255, 165, 0", purple: "128, 0, 128", transparent: "0, 0, 0" };

/** `r, g, b` for USO's `/*[[name-rgb]]*\/` placeholders. */
export function colorToRgb(value: string): string | null {
    const color = value.trim().toLowerCase();
    if (NAMED_COLORS[color]) return NAMED_COLORS[color];
    let hex = color.match(/^#([\da-f]{3,8})$/)?.[1];
    if (hex) {
        if (hex.length <= 4) hex = [...hex].map(char => char + char).join("");
        return [0, 2, 4].map(index => Number.parseInt(hex!.slice(index, index + 2), 16)).join(", ");
    }
    const rgb = color.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/);
    return rgb ? `${rgb[1]}, ${rgb[2]}, ${rgb[3]}` : null;
}

/** USO preprocessor: replaces `/*[[name]]*\/` (and `-rgb`) placeholders, recursively inside option values. */
function applyUso(source: string, vars: Record<string, UserCssVar>): string {
    const pool = new Map<string, string>();
    const resolve = (name: string): string | null => {
        if (vars[name]) return varValue(vars[name]);
        const base = name.match(/^(.+)-rgb$/)?.[1];
        if (base && vars[base]) return colorToRgb(varValue(vars[base]));
        return null;
    };
    const replace = (text: string, depth: number): string => text.replaceAll(/\/\*\[\[([\w-]+)\]\]\*\//g, (match, name: string) => {
        if (!pool.has(name)) {
            const value = resolve(name);
            pool.set(name, value == null ? match : depth < 8 ? replace(value, depth + 1) : value);
        }
        return pool.get(name)!;
    });
    return replace(source, 0);
}

const GLOBAL_STATEMENT = /^(?:\s+|\/\*[\s\S]*?\*\/|@(?:charset|import|namespace)\b[^;]*;)*/;

/** Default preprocessor: variables become custom properties on `:root`, placed after any @charset/@import. */
function withRootVars(code: string, vars: Record<string, UserCssVar>): string {
    const names = Object.keys(vars);
    if (!names.length || isEmptyCode(code)) return code;
    const block = `:root {\n${names.map(name => `  --${name}: ${varValue(vars[name])};\n`).join("")}}\n`;
    const at = code.match(GLOBAL_STATEMENT)?.[0].length ?? 0;
    return code.slice(0, at) + block + code.slice(at);
}

export function isEmptyCode(code: string): boolean {
    return !code.replaceAll(/\/\*[\s\S]*?\*\//g, "").trim();
}

function skipComment(text: string, index: number): number {
    const end = text.indexOf("*/", index + 2);
    return end < 0 ? text.length : end + 2;
}

function skipString(text: string, index: number): number {
    const quote = text[index];
    for (let i = index + 1; i < text.length; i++) {
        if (text[i] === "\\") i++;
        else if (text[i] === quote) return i + 1;
    }
    return text.length;
}

/** Index just past the `}` that closes the block opened at `open`, skipping strings and comments. */
function blockEnd(text: string, open: number): number {
    let depth = 0;
    for (let i = open; i < text.length;) {
        const char = text[i];
        if (char === "/" && text[i + 1] === "*") { i = skipComment(text, i); continue; }
        if (char === "\"" || char === "'") { i = skipString(text, i); continue; }
        if (char === "{") depth++;
        else if (char === "}" && --depth === 0) return i + 1;
        i++;
    }
    return text.length;
}

const unescapeCss = (value: string) => value.replaceAll(/\\([\da-fA-F]{1,6}\s?|[\s\S])/g, (_, escape: string) => /^[\da-fA-F]/.test(escape) && escape.trim().length > 1 ? String.fromCodePoint(Number.parseInt(escape.trim(), 16)) : escape);

const CONDITION = /(url-prefix|url|domain|regexp)\(\s*(?:"((?:[^"\\]|\\[\s\S])*)"|'((?:[^'\\]|\\[\s\S])*)'|([^)]*?))\s*\)/gi;
const CONDITION_KEY = { "url": "urls", "url-prefix": "urlPrefixes", "domain": "domains", "regexp": "regexps" } as const;

function parseConditions(text: string): Omit<StyleSection, "code"> {
    const section: Omit<StyleSection, "code"> = {};
    for (const match of text.matchAll(CONDITION)) {
        const key = CONDITION_KEY[match[1].toLowerCase() as keyof typeof CONDITION_KEY];
        const quoted = match[2] ?? match[3];
        const value = quoted != null ? unescapeCss(quoted) : match[4].trim();
        (section[key] ??= []).push(value);
    }
    return section;
}

/** Splits compiled CSS into Stylus sections: one per top-level `@-moz-document`, plus the code outside them. */
export function extractSections(css: string): StyleSection[] {
    const sections: StyleSection[] = [];
    let outside = "";
    let from = 0;
    for (let i = 0; i < css.length;) {
        const char = css[i];
        if (char === "/" && css[i + 1] === "*") { i = skipComment(css, i); continue; }
        if (char === "\"" || char === "'") { i = skipString(css, i); continue; }
        if (char === "{") { i = blockEnd(css, i); continue; }
        if (char === "@" && /^@(?:-moz-)?document\b/i.test(css.slice(i, i + 15))) {
            const open = css.indexOf("{", i);
            if (open < 0) break;
            const close = blockEnd(css, open);
            outside += css.slice(from, i);
            sections.push({ ...parseConditions(css.slice(i, open)), code: css.slice(open + 1, close - 1).trim() });
            i = from = close;
            continue;
        }
        i++;
    }
    outside += css.slice(from);
    const globalCode = outside.replace(META_BLOCK, "").trim();
    if (!isEmptyCode(globalCode)) sections.unshift({ code: globalCode });
    return sections.filter(section => !isEmptyCode(section.code));
}

/** Compiles a UserCSS source with the given variable values into Stylus-style sections. */
export function compileUserCss(source: string, meta: StyleMeta): StyleSection[] {
    if (!SUPPORTED_PREPROCESSORS.has(meta.preprocessor)) throw new Error(`使用了 @preprocessor ${meta.preprocessor}，需要对应的编译器，LD++ 暂不支持；可在 Stylus 中导出备份（JSON）后导入，会直接使用备份里已编译的结果`);
    const code = meta.preprocessor === "uso" ? applyUso(source, meta.vars) : source;
    const sections = extractSections(code);
    return meta.preprocessor === "default" ? sections.map(section => ({ ...section, code: withRootVars(section.code, meta.vars) })) : sections;
}

const isGlobal = (section: StyleSection) => !section.domains?.length && !section.urlPrefixes?.length && !section.urls?.length && !section.regexps?.length;

const regexCache = new Map<string, RegExp | null>();
function fullMatch(pattern: string): RegExp | null {
    if (!regexCache.has(pattern)) {
        try { regexCache.set(pattern, new RegExp(`^(?:${pattern})$`)); } catch { regexCache.set(pattern, null); }
    }
    return regexCache.get(pattern) ?? null;
}

/** Stylus `urlMatchSection`: domain (incl. subdomains), URL prefix, exact URL (hash ignored), full-match regexp. */
export function sectionMatches(section: StyleSection, href: string): boolean {
    if (isGlobal(section)) return true;
    let host = "";
    try { host = new URL(href).hostname; } catch { /* not a URL */ }
    const bare = href.split("#")[0];
    return Boolean(section.domains?.some(domain => host === domain || host.endsWith(`.${domain}`))
        || section.urlPrefixes?.some(prefix => href.startsWith(prefix))
        || section.urls?.some(url => url === href || url === bare)
        || section.regexps?.some(pattern => fullMatch(pattern)?.test(href)));
}

/** Whether a section can depend on the path, so the CSS must be rebuilt after in-page navigation. */
export const isPathDependent = (section: StyleSection) => Boolean(section.urlPrefixes?.length || section.urls?.length || section.regexps?.length);

const SITE_SAMPLES = ["https://linux.do/", "https://linux.do/latest", "https://linux.do/t/topic/1", "https://linux.do/search?q=a", "https://linux.do/u/me"];

/** Whether any section of a style can apply somewhere on linux.do (global sections count). */
export function appliesToSite(sections: StyleSection[]): boolean {
    return sections.some(section => isGlobal(section)
        || section.domains?.some(domain => "linux.do" === domain || "linux.do".endsWith(`.${domain}`))
        || section.urlPrefixes?.some(prefix => "https://linux.do/".startsWith(prefix) || prefix.startsWith("https://linux.do"))
        || section.urls?.some(url => url.startsWith("https://linux.do"))
        || section.regexps?.some(pattern => SITE_SAMPLES.some(sample => fullMatch(pattern)?.test(sample))));
}

export function cssFor(sections: StyleSection[], href: string): string {
    return sections.filter(section => sectionMatches(section, href)).map(section => section.code).join("\n");
}

/** Plain CSS (no metadata) or classic sections turned back into an editable source. */
const quote = (value: string) => JSON.stringify(value);

export function sectionsToSource(sections: StyleSection[]): string {
    return sections.map(section => {
        if (isGlobal(section)) return section.code;
        const conditions = [
            ...(section.domains ?? []).map(value => `domain(${quote(value)})`),
            ...(section.urlPrefixes ?? []).map(value => `url-prefix(${quote(value)})`),
            ...(section.urls ?? []).map(value => `url(${quote(value)})`),
            ...(section.regexps ?? []).map(value => `regexp(${quote(value)})`),
        ];
        return `@-moz-document ${conditions.join(", ")} {\n${section.code}\n}`;
    }).join("\n\n");
}

export interface BackupStyle {
    name: string;
    enabled: boolean;
    author?: string;
    description?: string;
    updateUrl?: string;
    sections: StyleSection[];
    sourceCode?: string;
    preprocessor?: string;
    vars?: Record<string, UserCssVar>;
}

function cleanSection(raw: Record<string, unknown>): StyleSection {
    const section: StyleSection = { code: String(raw.code ?? "") };
    for (const key of ["domains", "urlPrefixes", "urls", "regexps"] as const) {
        const list = Array.isArray(raw[key]) ? (raw[key] as unknown[]).map(String).filter(Boolean) : [];
        if (list.length) section[key] = list;
    }
    return section;
}

/** The styles in a Stylus backup (`stylus-YYYY-MM-DD.json`): an array of style objects, plus one settings entry. */
export function readStylusBackup(raw: unknown): BackupStyle[] | null {
    const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>).styles) ? (raw as Record<string, unknown[]>).styles : null;
    if (!list) return null;
    const styles = list.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && Array.isArray((item as Record<string, unknown>).sections));
    if (!styles.length) return null;
    return styles.map(style => {
        const usercss = (style.usercssData ?? null) as Record<string, unknown> | null;
        const vars = usercss?.vars && typeof usercss.vars === "object"
            ? Object.fromEntries(Object.entries(usercss.vars as Record<string, Record<string, unknown>>).map(([name, value]) => [name, normalizeVar(name, value)]))
            : undefined;
        return {
            name: str(style.name) ?? "未命名样式",
            enabled: style.enabled !== false,
            author: str(style.author) ?? str(usercss?.author),
            description: str(style.description) ?? str(usercss?.description),
            updateUrl: str(style.updateUrl),
            sections: (style.sections as Array<Record<string, unknown>>).map(cleanSection).filter(section => !isEmptyCode(section.code)),
            sourceCode: str(style.sourceCode),
            preprocessor: usercss ? str(usercss.preprocessor) ?? "default" : undefined,
            vars,
        };
    });
}
