/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { errorMessage } from "@utils/misc";

import type { AIProfile, ImageDetail } from "./AI";
import { httpRequest } from "./Http";
import type { TopicImage } from "./TopicContent";

export interface PreparedImage {
    id: number;
    url: string;
    detail: ImageDetail;
    bytes: number;
}

export interface SkippedImage {
    id: number;
    reason: string;
}

const logger = new Logger("Images");
const MB = 1024 * 1024;
const TRUSTED_HOSTS = ["linux.do", "ldstatic.com", "discourse-cdn.com"];
const SUPPORTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_EDGE = 1600;
const QUALITIES = [0.85, 0.72, 0.6, 0.48];
const SHRINK = 0.7;

export function isTrustedImage(url: string): boolean {
    try {
        const host = new URL(url).hostname.toLowerCase();
        return TRUSTED_HOSTS.some(suffix => host === suffix || host.endsWith(`.${suffix}`));
    } catch {
        return false;
    }
}

function mimeOf(contentType: string, url: string): string {
    const type = contentType.split(";")[0].trim().toLowerCase().replace("image/jpg", "image/jpeg");
    if (SUPPORTED.has(type)) return type;
    const ext = url.toLowerCase().match(/\.(jpe?g|png|webp|gif)(?:$|[?#])/)?.[1];
    if (!ext) return type;
    return ext.startsWith("jp") ? "image/jpeg" : `image/${ext}`;
}

function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener("load", () => resolve(String(reader.result)));
        reader.addEventListener("error", () => reject(reader.error ?? new Error("读取图片失败")));
        reader.readAsDataURL(blob);
    });
}

async function compress(blob: Blob, maxBytes: number): Promise<Blob | null> {
    const bitmap = await createImageBitmap(blob);
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        let scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
        for (let round = 0; round < 4; round++, scale *= SHRINK) {
            canvas.width = Math.max(1, Math.round(bitmap.width * scale));
            canvas.height = Math.max(1, Math.round(bitmap.height * scale));
            ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
            for (const quality of QUALITIES) {
                const out = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
                if (out && out.size <= maxBytes) return out;
            }
        }
        return null;
    } finally {
        bitmap.close();
    }
}

async function download(url: string, maxBytes: number, signal?: AbortSignal | null): Promise<Blob> {
    const res = await httpRequest({ url, responseType: "arraybuffer", timeout: 20_000, signal, credentials: "include" });
    if (!res.ok || !res.buffer) throw new Error(`图片 HTTP ${res.status}`);
    const mime = mimeOf(res.contentType, url);
    if (!SUPPORTED.has(mime)) throw new Error(`不支持的图片格式 ${mime || "未知"}`);
    const blob = new Blob([res.buffer], { type: mime });
    if (blob.size <= maxBytes) return blob;
    const smaller = await compress(blob, maxBytes);
    if (!smaller) throw new Error("图片过大且压缩失败");
    return smaller;
}

export async function prepareImages(images: TopicImage[], profile: AIProfile | null, signal?: AbortSignal | null): Promise<{ prepared: PreparedImage[]; skipped: SkippedImage[] }> {
    const prepared: PreparedImage[] = [];
    const skipped: SkippedImage[] = [];
    if (!profile?.imageInput) return { prepared, skipped };
    const maxBytes = profile.maxImageMB * MB;
    const maxTotal = profile.maxTotalImageMB * MB;
    let total = 0;
    for (const image of images) {
        if (prepared.length >= profile.maxImages) {
            skipped.push({ id: image.id, reason: "超过单次图片数量上限" });
            continue;
        }
        if (!isTrustedImage(image.url)) {
            skipped.push({ id: image.id, reason: "站外图片" });
            continue;
        }
        try {
            const blob = await download(image.url, maxBytes, signal);
            if (total + blob.size > maxTotal) {
                skipped.push({ id: image.id, reason: "超过图片总大小上限" });
                continue;
            }
            total += blob.size;
            prepared.push({ id: image.id, url: await blobToDataUrl(blob), detail: profile.imageDetail, bytes: blob.size });
        } catch (error) {
            if (signal?.aborted) throw error;
            logger.warn(`图片 #${image.id} 准备失败`, error);
            skipped.push({ id: image.id, reason: errorMessage(error) });
        }
    }
    return { prepared, skipped };
}
