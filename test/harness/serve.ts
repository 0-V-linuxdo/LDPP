/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { resolve } from "path";

const root = resolve(import.meta.dir, "../..");
const port = Number(process.env.PORT ?? 8787);

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Private-Network": "true",
    "Cache-Control": "no-store",
};

Bun.serve({
    port,
    hostname: "127.0.0.1",
    async fetch(req) {
        if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
        const path = new URL(req.url).pathname;
        const file = Bun.file(resolve(root, `.${path}`));
        if (!path.startsWith("/userscript/") && !path.startsWith("/test/harness/") && !path.startsWith("/dist/")) return new Response("forbidden", { status: 403, headers: CORS });
        if (!await file.exists()) return new Response("not found", { status: 404, headers: CORS });
        return new Response(file, { headers: { ...CORS, "Content-Type": path.endsWith(".html") ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8" } });
    },
});

console.log(`LD++ harness server on http://127.0.0.1:${port}`);
