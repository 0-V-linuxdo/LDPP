/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The 「头像」 tab, after Void++'s CustomSidebarIdentity: an address, a pasted / dropped / picked picture, then a
// circle to drag and zoom. The picture is kept (shrunk to SOURCE_PX) so the crop can be changed later, and the crop is
// baked into a small AVATAR_PX picture, which is what the page shows. Remote pictures are fetched through the script
// manager, so they can be cropped too; one that cannot be fetched is used as it is.

import { httpRequest } from "@api/Http";
import { Button, Hint, TextInput } from "@components/controls";
import { h } from "@utils/dom";
import { clamp, isAbortError, pickFiles } from "@utils/misc";

import { cropRect, usableAvatar, ZOOM_MAX, ZOOM_MIN } from "./paint";

const SOURCE_PX = 640;
const AVATAR_PX = 256;
const ZOOM_STEP = 1.08;

export interface AvatarStore {
    /** What the page shows: the baked crop, or a remote address used as it is. */
    avatarUrl: string;
    /** The address typed in, kept to show in the field. */
    avatarLink: string;
    /** The picture the crop is cut from (a data URI), or "" when there is none to crop. */
    avatarSource: string;
    cropX: number;
    cropY: number;
    cropZoom: number;
}

function encode(canvas: HTMLCanvasElement): string | null {
    // WebP keeps the stored settings small; a browser without it gives PNG, which works just as well.
    const url = canvas.toDataURL("image/webp", 0.92);
    return url.startsWith("data:image/") ? url : null;
}

function draw(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void): string | null {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    paint(ctx);
    return encode(canvas);
}

async function bitmap(blob: Blob): Promise<ImageBitmap | null> {
    try {
        return await createImageBitmap(blob);
    } catch {
        return null;
    }
}

/** A picture shrunk so its longer edge is at most SOURCE_PX. */
async function capBlob(blob: Blob): Promise<string | null> {
    const bmp = await bitmap(blob);
    if (!bmp) return null;
    const scale = Math.min(1, SOURCE_PX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * scale));
    const height = Math.max(1, Math.round(bmp.height * scale));
    const url = draw(w, height, ctx => ctx.drawImage(bmp, 0, 0, w, height));
    bmp.close();
    return url;
}

async function fetchBlob(url: string): Promise<Blob | null> {
    try {
        if (url.startsWith("data:")) return await (await fetch(url)).blob();
        const res = await httpRequest({ url, responseType: "arraybuffer", timeout: 20_000 });
        if (!res.ok || !res.buffer) return null;
        return new Blob([res.buffer], { type: res.contentType.split(";")[0] || "image/png" });
    } catch {
        return null;
    }
}

/** The crop of `src` centred at (x, y) (fractions of the picture) at `zoom`, as an AVATAR_PX square. */
async function bake(src: string, x: number, y: number, zoom: number): Promise<string | null> {
    const blob = await fetchBlob(src);
    const bmp = blob && await bitmap(blob);
    if (!bmp) return null;
    const r = cropRect(bmp.width, bmp.height, zoom, x * bmp.width, y * bmp.height);
    const url = draw(AVATAR_PX, AVATAR_PX, ctx => ctx.drawImage(bmp, r.x - r.side / 2, r.y - r.side / 2, r.side, r.side, 0, 0, AVATAR_PX, AVATAR_PX));
    bmp.close();
    return url;
}

function imageFile(data: DataTransfer | null): File | null {
    if (!data) return null;
    for (const file of data.files) if (file.type.startsWith("image/")) return file;
    for (const item of data.items) if (item.kind === "file" && item.type.startsWith("image/")) return item.getAsFile();
    return null;
}

/** Whether a drag carries a picture; its files cannot be read until the drop. */
function dragsImage(data: DataTransfer | null): boolean {
    return [...data?.items ?? []].some(item => item.kind === "file" && item.type.startsWith("image/"));
}

export function AvatarEditor(store: AvatarStore): HTMLElement {
    let generation = 0;
    let bakeTimer: ReturnType<typeof setTimeout> | undefined;
    let natural: { w: number; h: number } | null = null;
    let pos = { x: store.cropX, y: store.cropY, zoom: store.cropZoom };
    let drag: { px: number; py: number; x: number; y: number } | null = null;

    const preview = h("img", { class: "ldpp-identity-preview", alt: "", referrerPolicy: "no-referrer" });
    const status = h("div", { class: "ldpp-identity-status" });
    const input = TextInput({ value: store.avatarLink, placeholder: "粘贴图片，或填图片地址 https://…", onChange: value => void useLink(value) }) as HTMLInputElement;
    const stageImg = h("img", { class: "ldpp-identity-stage-img", alt: "", draggable: false });
    const stage = h("div", { class: "ldpp-identity-stage", title: "拖动选择位置，滚轮缩放" }, stageImg);
    const zoomInput = h("input", { type: "range", class: "ldpp-slider", min: String(ZOOM_MIN), max: String(ZOOM_MAX), step: "0.05", attrs: { "aria-label": "缩放" } });
    const zoomValue = h("output", { class: "ldpp-slider-value" });
    const crop = h("div", { class: "ldpp-identity-crop" },
        stage,
        h("div", { class: "ldpp-identity-zoom" },
            h("span", { class: "ldpp-slider-wrap" }, zoomInput, zoomValue),
            Button("复位", { small: true, onClick: () => commit(0.5, 0.5, 1, true) }),
        ),
        h("p", { class: "ldpp-muted" }, "拖动图片选择位置，滚轮或滑块缩放；圆圈就是头像显示的范围。"),
    );

    function setStatus(text: string, kind: "info" | "warning" = "info") {
        status.replaceChildren(text ? Hint(text, kind) : "");
    }

    function layoutStage() {
        if (!natural) return;
        const r = cropRect(natural.w, natural.h, pos.zoom, pos.x * natural.w, pos.y * natural.h);
        stageImg.style.width = `${(natural.w / r.side) * 100}%`;
        stageImg.style.height = `${(natural.h / r.side) * 100}%`;
        stageImg.style.left = `${(0.5 - r.x / r.side) * 100}%`;
        stageImg.style.top = `${(0.5 - r.y / r.side) * 100}%`;
        zoomInput.value = String(r.z);
        zoomValue.textContent = `${Math.round(r.z * 100)}%`;
    }

    function render() {
        const shown = usableAvatar(store.avatarUrl);
        preview.hidden = !shown;
        if (shown && preview.getAttribute("src") !== shown) preview.src = shown;
        input.value = store.avatarLink;
        input.placeholder = store.avatarSource && !store.avatarLink ? "正在用粘贴的图片；填图片地址可替换" : "粘贴图片，或填图片地址 https://…";
        crop.hidden = !store.avatarSource;
        if (!store.avatarSource) {
            natural = null;
            stageImg.removeAttribute("src");
            return;
        }
        if (stageImg.getAttribute("src") !== store.avatarSource) {
            natural = null;
            stageImg.src = store.avatarSource;
        }
        layoutStage();
    }

    /** Moves the crop, keeping it inside the picture. */
    function place(x: number, y: number, zoom: number) {
        if (!natural) {
            pos = { x, y, zoom: clamp(zoom, ZOOM_MIN, ZOOM_MAX) };
            return;
        }
        const r = cropRect(natural.w, natural.h, zoom, x * natural.w, y * natural.h);
        pos = { x: r.x / natural.w, y: r.y / natural.h, zoom: r.z };
        layoutStage();
    }

    /** Saves the crop and bakes the avatar from it. */
    function save() {
        store.cropX = pos.x;
        store.cropY = pos.y;
        store.cropZoom = pos.zoom;
        const gen = generation;
        const src = store.avatarSource;
        void bake(src, pos.x, pos.y, pos.zoom).then(url => {
            if (!url || gen !== generation || src !== store.avatarSource) return;
            store.avatarUrl = url;
            render();
        });
    }

    /** Places the crop and saves it shortly after, or now. */
    function commit(x: number, y: number, zoom: number, now = false) {
        place(x, y, zoom);
        clearTimeout(bakeTimer);
        if (now) save();
        else bakeTimer = setTimeout(save, 120);
    }

    /** Takes a new picture to crop from, centred and unzoomed. */
    async function adopt(source: string, link: string): Promise<boolean> {
        const gen = ++generation;
        const baked = await bake(source, 0.5, 0.5, 1);
        if (gen !== generation || !baked) return false;
        Object.assign(store, { avatarSource: source, avatarLink: link, avatarUrl: baked, cropX: 0.5, cropY: 0.5, cropZoom: 1 });
        pos = { x: 0.5, y: 0.5, zoom: 1 };
        render();
        return true;
    }

    async function useBlob(blob: Blob) {
        setStatus("正在读取图片…");
        const source = await capBlob(blob);
        if (!source || !await adopt(source, "")) {
            setStatus("无法读取这张图片。", "warning");
            return;
        }
        setStatus("");
    }

    async function useLink(raw: string) {
        const link = raw.trim();
        if (!link) {
            clear();
            return;
        }
        const url = usableAvatar(link);
        if (!url) {
            setStatus("请填 http(s) 图片地址或 data:image 开头的内容。", "warning");
            return;
        }
        setStatus("正在读取图片…");
        const gen = ++generation;
        const blob = await fetchBlob(url);
        const source = blob && await capBlob(blob);
        if (gen !== generation) return;
        if (source && await adopt(source, link.startsWith("data:") ? "" : link)) {
            setStatus("");
            return;
        }
        // Not readable here (blocked, not an image the browser decodes): show the address as it is, without a crop.
        ++generation;
        Object.assign(store, { avatarUrl: url, avatarLink: link, avatarSource: "", cropX: 0.5, cropY: 0.5, cropZoom: 1 });
        render();
        setStatus("图片读取失败，已直接使用这个地址（无法裁剪）；如果头像不显示，请换个地址或粘贴图片。", "warning");
    }

    function clear() {
        ++generation;
        clearTimeout(bakeTimer);
        Object.assign(store, { avatarUrl: "", avatarLink: "", avatarSource: "", cropX: 0.5, cropY: 0.5, cropZoom: 1 });
        pos = { x: 0.5, y: 0.5, zoom: 1 };
        setStatus("");
        render();
    }

    async function pick() {
        try {
            const [file] = await pickFiles("image/*");
            await useBlob(file);
        } catch (error) {
            if (!isAbortError(error)) setStatus("无法读取这张图片。", "warning");
        }
    }

    stageImg.addEventListener("load", () => {
        natural = { w: stageImg.naturalWidth, h: stageImg.naturalHeight };
        layoutStage();
    });
    stage.addEventListener("pointerdown", (event: PointerEvent) => {
        if (event.button !== 0) return;
        event.preventDefault();
        stage.setPointerCapture(event.pointerId);
        drag = { px: event.clientX, py: event.clientY, x: pos.x, y: pos.y };
    });
    stage.addEventListener("pointermove", (event: PointerEvent) => {
        if (!drag || !natural) return;
        const size = stage.clientWidth;
        if (!size) return;
        const { side } = cropRect(natural.w, natural.h, pos.zoom, drag.x * natural.w, drag.y * natural.h);
        place(drag.x - ((event.clientX - drag.px) * side / size) / natural.w, drag.y - ((event.clientY - drag.py) * side / size) / natural.h, pos.zoom);
    });
    const endDrag = () => {
        if (!drag) return;
        drag = null;
        commit(pos.x, pos.y, pos.zoom, true);
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("wheel", (event: WheelEvent) => {
        event.preventDefault();
        commit(pos.x, pos.y, pos.zoom * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
    }, { passive: false });
    zoomInput.addEventListener("input", () => commit(pos.x, pos.y, Number(zoomInput.value)));

    const root = h("div", { class: "ldpp-identity-editor" },
        h("div", { class: "ldpp-identity-row" },
            h("div", { class: "ldpp-identity-preview-box" }, preview),
            h("div", { class: "ldpp-identity-source" },
                input,
                h("div", { class: "ldpp-row-actions" },
                    Button("选择图片", { small: true, onClick: () => void pick() }),
                    Button("清除头像", { small: true, kind: "ghost", onClick: clear }),
                ),
            ),
        ),
        status,
        crop,
    );
    const takeImage = (event: ClipboardEvent | DragEvent) => {
        const file = imageFile("clipboardData" in event ? event.clipboardData : event.dataTransfer);
        if (!file) return;
        event.preventDefault();
        void useBlob(file);
    };
    root.addEventListener("paste", takeImage);
    root.addEventListener("dragover", (event: DragEvent) => { if (dragsImage(event.dataTransfer)) event.preventDefault(); });
    root.addEventListener("drop", takeImage);
    render();
    return root;
}
