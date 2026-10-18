/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { normalizeText } from "@utils/text";

import { type DiscourseRequestOptions, fetchAllPosts, fetchTopic, type TopicPost } from "./Discourse";

export interface TopicImage {
    id: number;
    url: string;
    alt: string;
    floor: number;
    username: string;
}

export interface TopicContent {
    topicId: string;
    title: string;
    text: string;
    images: TopicImage[];
    postCount: number;
    truncated: boolean;
}

const BLOCK_TAGS = new Set(["P", "DIV", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE", "TR", "TABLE", "UL", "OL", "ASIDE", "DETAILS", "SUMMARY", "HR"]);
const SKIP_SELECTOR = "script, style, .meta, .lightbox-wrapper .meta, .cooked-date, .spoiler-blurred-images";
const DECORATIVE = /\b(?:emoji|avatar|site-icon|favicon)\b/i;
const DECORATIVE_URL = /\/(?:emoji|letter_avatar_proxy|user_avatar)\//i;

function imageUrl(img: HTMLImageElement): string {
    const raw = img.getAttribute("data-orig-src") ?? img.getAttribute("data-src") ?? img.getAttribute("src") ?? "";
    const parent = img.closest("a.lightbox")?.getAttribute("href");
    const candidate = parent && /\.(?:png|jpe?g|gif|webp|avif)(?:$|\?)/i.test(parent) ? parent : raw;
    try { return new URL(candidate, location.origin).href; } catch { return ""; }
}

export function cookedToText(cooked: string, onImage: (img: HTMLImageElement) => string): string {
    const doc = new DOMParser().parseFromString(`<!doctype html><body>${cooked}`, "text/html");
    for (const el of Array.from(doc.querySelectorAll(SKIP_SELECTOR))) el.remove();
    const parts: string[] = [];
    const walk = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            parts.push(node.nodeValue ?? "");
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        const el = node as HTMLElement;
        const tag = el.tagName;
        if (tag === "BR") return void parts.push("\n");
        if (tag === "IMG") {
            const img = el as HTMLImageElement;
            const isDecorative = DECORATIVE.test(img.className) || DECORATIVE_URL.test(img.getAttribute("src") ?? "");
            parts.push(isDecorative ? img.alt || "" : onImage(img));
            return;
        }
        const block = BLOCK_TAGS.has(tag);
        if (block) parts.push("\n");
        if (tag === "LI") parts.push("- ");
        if (tag === "BLOCKQUOTE" || el.classList.contains("quote")) parts.push("> ");
        for (const child of Array.from(el.childNodes)) walk(child);
        if (tag === "A") {
            const href = el.getAttribute("href") ?? "";
            const label = normalizeText(el.textContent);
            if (/^https?:/i.test(href) && label && !href.includes(label)) parts.push(` (${href})`);
        }
        if (block) parts.push("\n");
    };
    walk(doc.body);
    return parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function formatPost(post: TopicPost, images: TopicImage[]): string {
    const floor = post.post_number;
    const body = cookedToText(post.cooked ?? "", img => {
        const url = imageUrl(img);
        if (!url) return "";
        const image: TopicImage = { id: images.length + 1, url, alt: normalizeText(img.alt), floor, username: post.username };
        images.push(image);
        return `[图片#${image.id}${image.alt ? ` ${image.alt}` : ""}]`;
    });
    const reply = post.reply_to_user?.username ? ` 回复 ${post.reply_to_user.username}` : "";
    return `#${floor} ${post.username}${reply}：\n${body}`;
}

async function loadPosts(topicId: string, firstPostOnly: boolean, options: DiscourseRequestOptions) {
    if (!firstPostOnly) return fetchAllPosts(topicId, options);
    const topic = await fetchTopic(topicId, options);
    return { title: normalizeText(topic.title), posts: topic.post_stream.posts.filter(post => post.post_number === 1).slice(0, 1) };
}

export async function buildTopicContent(topicId: string, { maxPosts = 0, firstPostOnly = false, ...options }: DiscourseRequestOptions & { maxPosts?: number; firstPostOnly?: boolean } = {}): Promise<TopicContent> {
    const { title, posts } = await loadPosts(topicId, firstPostOnly, options);
    const selected = maxPosts > 0 ? posts.slice(0, maxPosts) : posts;
    const images: TopicImage[] = [];
    const text = selected.map(post => formatPost(post, images)).join("\n\n");
    return { topicId, title, text, images, postCount: posts.length, truncated: selected.length < posts.length && !firstPostOnly };
}
