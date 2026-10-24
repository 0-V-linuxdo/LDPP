/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { clamp } from "@utils/misc";

/** Marks an avatar showing the custom picture; ORIG / ORIG_SET hold what Discourse had, for when it is put back. */
export const MARK = "data-ldpp-identity";
const ORIG = "data-ldpp-identity-orig";
const ORIG_SET = "data-ldpp-identity-srcset";
export const NAME_CLASS = "ldpp-identity-name";
export const HIDE_CLASS = "ldpp-identity-hidden";

/** Where the account's own avatar is when 「其他位置」 is off: the header and the user menu it opens. */
const OWN_UI = ".d-header, .user-menu, .menu-panel";
/** The two name spans of a floor: Discourse shows the full name and the username, in the order the site chose. */
const NAME_SPANS = ":scope > .full-name, :scope > .username";

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;

export interface Identity {
    /** The signed-in username; nothing is changed without one. */
    username: string;
    /** The picture to show, or null to keep Discourse's. */
    avatar: string | null;
    /** The name to show, or "" to keep Discourse's. */
    name: string;
    /** Also replace the avatar in topics, lists, user cards and so on, not only in the header. */
    everywhere: boolean;
}

/**
 * The square cut out of a w × h picture at `zoom` (1 = the largest square that fits), centred on (cx, cy) in pixels
 * and moved back inside the picture when it would stick out.
 */
export function cropRect(w: number, h: number, zoom: number, cx: number, cy: number) {
    const z = clamp(zoom, ZOOM_MIN, ZOOM_MAX);
    const side = Math.min(w, h) / z;
    const x = clamp(cx, side / 2, Math.max(side / 2, w - side / 2));
    const y = clamp(cy, side / 2, Math.max(side / 2, h - side / 2));
    return { z, side, x, y };
}

/** The user an avatar URL belongs to: …/user_avatar/linux.do/<name>/48/123_2.png. */
export function avatarOwner(src: string): string | null {
    const match = /\/user_avatar\/[^/]+\/([^/]+)\/\d+\//.exec(src);
    if (!match) return null;
    try {
        return decodeURIComponent(match[1]).toLowerCase();
    } catch {
        return match[1].toLowerCase();
    }
}

/** A setting value that can go in an img's src: a data:image URI or an http(s) address. */
export function usableAvatar(raw: string): string | null {
    const value = raw.trim();
    if (!value) return null;
    if (value.startsWith("data:image/")) return value;
    try {
        const { protocol } = new URL(value);
        return protocol === "https:" || protocol === "http:" ? value : null;
    } catch {
        return null;
    }
}

/** The picture each marked avatar was given, to tell it from a URL Discourse put there since. */
const painted = new WeakMap<HTMLImageElement, string>();

export function restoreImg(img: HTMLImageElement) {
    if (!img.hasAttribute(MARK)) return;
    const orig = img.getAttribute(ORIG);
    const set = img.getAttribute(ORIG_SET);
    const ours = img.getAttribute("src") === painted.get(img);
    img.removeAttribute(MARK);
    img.removeAttribute(ORIG);
    img.removeAttribute(ORIG_SET);
    painted.delete(img);
    // A src Discourse set after ours (the element was reused for another post) is already the right one.
    if (!ours) return;
    if (set) img.setAttribute("srcset", set);
    if (orig != null) img.src = orig;
}

/** The URL Discourse means the avatar to have: the one we replaced, unless it has set a new one since. */
function officialSrc(img: HTMLImageElement): string {
    const current = img.getAttribute("src") ?? "";
    if (!img.hasAttribute(MARK) || current !== painted.get(img)) return current;
    return img.getAttribute(ORIG) ?? "";
}

function paintImg(img: HTMLImageElement, url: string) {
    const current = img.getAttribute("src") ?? "";
    if (!img.hasAttribute(MARK) || current !== painted.get(img)) {
        img.setAttribute(ORIG, current);
        const set = img.getAttribute("srcset");
        if (set) img.setAttribute(ORIG_SET, set);
        else img.removeAttribute(ORIG_SET);
    }
    img.setAttribute(MARK, "");
    painted.set(img, url);
    if (img.hasAttribute("srcset")) img.removeAttribute("srcset");
    img.referrerPolicy = "no-referrer";
    if (current !== url) img.src = url;
}

function paintAvatars(root: ParentNode, { username, avatar, everywhere }: Identity) {
    for (const img of root.querySelectorAll<HTMLImageElement>(`img[src*="/user_avatar/"], img[${MARK}]`)) {
        const mine = avatarOwner(officialSrc(img)) === username && (everywhere || img.closest(OWN_UI));
        if (mine && avatar) paintImg(img, avatar);
        else restoreImg(img);
    }
}

function unpaintNames(names: Element) {
    for (const el of names.querySelectorAll(`:scope > .${NAME_CLASS}`)) el.remove();
    for (const el of names.querySelectorAll(`:scope > .${HIDE_CLASS}`)) el.classList.remove(HIDE_CLASS);
}

/**
 * A floor by the account gets one name span of ours, built from Discourse's first one so its link still opens the
 * user card, and Discourse's own name spans are hidden (not rewritten, since Ember keeps updating them).
 */
function paintNames(root: ParentNode, { username, name }: Identity) {
    for (const names of root.querySelectorAll(".topic-post .names, .topic-body .names")) {
        const official = [...names.querySelectorAll<HTMLElement>(NAME_SPANS)].filter(el => !el.classList.contains(NAME_CLASS));
        const link = official.map(el => el.querySelector<HTMLAnchorElement>("a[data-user-card]")).find(Boolean);
        const mine = link?.dataset.userCard?.toLowerCase() === username;
        if (!name || !mine || !link) {
            unpaintNames(names);
            continue;
        }
        let own = names.querySelector<HTMLElement>(`:scope > .${NAME_CLASS}`);
        if (!own) {
            const anchor = link.cloneNode(false) as HTMLAnchorElement;
            own = document.createElement("span");
            own.className = `first ${NAME_CLASS}`;
            own.setAttribute("data-ldpp", "identity");
            own.append(anchor);
            official[0].before(own);
        }
        const anchor = own.querySelector("a");
        if (anchor && anchor.textContent !== name) anchor.textContent = name;
        for (const el of official) el.classList.add(HIDE_CLASS);
    }
}

/** Shows the custom avatar and name wherever they belong to the account, and puts back what no longer should be. */
export function paintIdentity(root: ParentNode, identity: Identity) {
    paintAvatars(root, identity);
    paintNames(root, identity);
}

export function restoreIdentity(root: ParentNode) {
    for (const img of root.querySelectorAll<HTMLImageElement>(`img[${MARK}]`)) restoreImg(img);
    for (const names of root.querySelectorAll(`.names:has(> .${NAME_CLASS}), .names:has(> .${HIDE_CLASS})`)) unpaintNames(names);
}
