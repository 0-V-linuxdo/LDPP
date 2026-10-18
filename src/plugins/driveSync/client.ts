/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { httpRequest, type HttpResponse } from "@api/Http";
import { isObject } from "@utils/guards";
import { errorMessage } from "@utils/misc";

export interface DriveCredentials {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
}

export interface DriveFile {
    id: string;
    name: string;
}

const TOKEN_URLS = ["https://oauth2.googleapis.com/token", "https://www.googleapis.com/oauth2/v4/token"];
const FILE_BASES = ["https://www.googleapis.com/drive/v3/files", "https://content.googleapis.com/drive/v3/files"];
const UPLOAD_BASES = ["https://www.googleapis.com/upload/drive/v3/files", "https://content.googleapis.com/upload/drive/v3/files"];
const FOLDER_MIME = "application/vnd.google-apps.folder";
const TOKEN_MARGIN_MS = 60_000;

export class DriveError extends Error {
    constructor(message: string, readonly status = 0) {
        super(message);
        this.name = "DriveError";
    }
}

const quote = (value: string) => `'${value.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

function parseJson(res: HttpResponse, what: string): Record<string, unknown> {
    try {
        const json = res.text ? JSON.parse(res.text) : {};
        if (isObject(json)) return json;
    } catch {
        throw new DriveError(`${what}：返回内容不是 JSON`, res.status);
    }
    throw new DriveError(`${what}：返回内容格式不对`, res.status);
}

export class DriveClient {
    private token = "";
    private expiresAt = 0;

    constructor(private readonly creds: DriveCredentials) {}

    get configured(): boolean {
        return Boolean(this.creds.clientId && this.creds.clientSecret && this.creds.refreshToken);
    }

    private async accessToken(): Promise<string> {
        if (this.token && Date.now() < this.expiresAt - TOKEN_MARGIN_MS) return this.token;
        if (!this.configured) throw new DriveError("Google Drive 凭据未填写完整");
        const body = new URLSearchParams({
            client_id: this.creds.clientId,
            client_secret: this.creds.clientSecret,
            refresh_token: this.creds.refreshToken,
            grant_type: "refresh_token",
        }).toString();
        let lastError: unknown = null;
        for (const url of TOKEN_URLS) {
            try {
                const res = await httpRequest({ method: "POST", url, headers: { "Content-Type": "application/x-www-form-urlencoded" }, body, credentials: "omit", timeout: 20_000 });
                const json = parseJson(res, "获取 Drive 令牌");
                if (!res.ok || typeof json.access_token !== "string") throw new DriveError(`获取 Drive 令牌失败：HTTP ${res.status} ${String(json.error_description ?? json.error ?? "")}`.trim(), res.status);
                this.token = json.access_token;
                this.expiresAt = Date.now() + (Number(json.expires_in) || 3600) * 1000;
                return this.token;
            } catch (error) {
                lastError = error;
                if (error instanceof DriveError && error.status >= 400 && error.status < 500) throw error;
            }
        }
        throw lastError instanceof Error ? lastError : new DriveError(errorMessage(lastError));
    }

    private async call(bases: string[], suffix: string, init: { method?: string; headers?: Record<string, string>; body?: string; allow404?: boolean } = {}): Promise<HttpResponse> {
        const token = await this.accessToken();
        let lastError: unknown = null;
        for (const base of bases) {
            try {
                const res = await httpRequest({ method: init.method ?? "GET", url: `${base}${suffix}`, headers: { Authorization: `Bearer ${token}`, ...init.headers }, body: init.body, credentials: "omit", timeout: 30_000 });
                if (res.ok || (init.allow404 && res.status === 404)) return res;
                if (res.status >= 400 && res.status < 500) throw new DriveError(`Drive 请求失败：HTTP ${res.status} ${res.text.slice(0, 300)}`, res.status);
                lastError = new DriveError(`Drive 服务器错误：HTTP ${res.status}`, res.status);
            } catch (error) {
                if (error instanceof DriveError && error.status >= 400 && error.status < 500) throw error;
                lastError = error;
            }
        }
        throw lastError instanceof Error ? lastError : new DriveError(errorMessage(lastError));
    }

    async list(query: string): Promise<DriveFile[]> {
        const files: DriveFile[] = [];
        let pageToken = "";
        do {
            const params = new URLSearchParams({ q: query, fields: "nextPageToken,files(id,name)", spaces: "drive", pageSize: "1000" });
            if (pageToken) params.set("pageToken", pageToken);
            const json = parseJson(await this.call(FILE_BASES, `?${params}`), "列出 Drive 文件");
            for (const file of Array.isArray(json.files) ? json.files : []) {
                if (isObject(file) && typeof file.id === "string") files.push({ id: file.id, name: String(file.name ?? "") });
            }
            pageToken = typeof json.nextPageToken === "string" ? json.nextPageToken : "";
        } while (pageToken);
        return files;
    }

    async findOne(name: string, parent: string | null, folder: boolean): Promise<string | null> {
        const clauses = [`name = ${quote(name)}`, "trashed = false", folder ? `mimeType = ${quote(FOLDER_MIME)}` : `mimeType != ${quote(FOLDER_MIME)}`];
        if (parent) clauses.push(`${quote(parent)} in parents`);
        const found = await this.list(clauses.join(" and "));
        if (found.length > 1) throw new DriveError(`Drive 中有多个同名${folder ? "文件夹" : "文件"}「${name}」，为避免写错位置已停止同步，请先清理重复项`);
        return found[0]?.id ?? null;
    }

    async ensureFolder(name: string, parent: string | null): Promise<string> {
        const existing = await this.findOne(name, parent, true);
        if (existing) return existing;
        const metadata = { name, mimeType: FOLDER_MIME, ...(parent ? { parents: [parent] } : {}) };
        const json = parseJson(await this.call(FILE_BASES, "?fields=id", { method: "POST", headers: { "Content-Type": "application/json; charset=UTF-8" }, body: JSON.stringify(metadata) }), "创建 Drive 文件夹");
        if (typeof json.id !== "string") throw new DriveError("创建 Drive 文件夹失败");
        return json.id;
    }

    async children(parent: string): Promise<DriveFile[]> {
        return this.list(`${quote(parent)} in parents and trashed = false`);
    }

    async download(id: string): Promise<string | null> {
        const res = await this.call(FILE_BASES, `/${encodeURIComponent(id)}?alt=media`, { allow404: true });
        return res.status === 404 ? null : res.text;
    }

    async upload(name: string, parent: string, content: string, id?: string | null): Promise<string> {
        const boundary = `ldpp${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
        const metadata = id ? { name } : { name, parents: [parent], mimeType: "application/json" };
        const body = [
            `--${boundary}`,
            "Content-Type: application/json; charset=UTF-8",
            "",
            JSON.stringify(metadata),
            `--${boundary}`,
            "Content-Type: application/json; charset=UTF-8",
            "",
            content,
            `--${boundary}--`,
        ].join("\r\n");
        const suffix = id ? `/${encodeURIComponent(id)}?uploadType=multipart&fields=id` : "?uploadType=multipart&fields=id";
        const json = parseJson(await this.call(UPLOAD_BASES, suffix, { method: id ? "PATCH" : "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }), "上传 Drive 文件");
        return typeof json.id === "string" ? json.id : id ?? "";
    }
}
