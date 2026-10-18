/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { beforeEach, describe, expect, test } from "bun:test";

import { Summaries } from "../src/api/DataStore";
import type { DriveClient } from "../src/plugins/driveSync/client";
import { DriveSync, INDEX_FILE, LEGACY_FILE } from "../src/plugins/driveSync/sync";

interface FakeFile { id: string; name: string; parent: string | null; content: string }

class FakeDrive {
    files: FakeFile[] = [];
    private seq = 0;
    add(name: string, parent: string | null, content = "") {
        const file = { id: `f${++this.seq}`, name, parent, content };
        this.files.push(file);
        return file;
    }
    byName(name: string) { return this.files.find(file => file.name === name); }
    async ensureFolder(name: string, parent: string | null) { return (this.files.find(file => file.name === name && file.parent === parent) ?? this.add(name, parent)).id; }
    async findOne(name: string, parent: string | null) { return this.files.find(file => file.name === name && file.parent === parent)?.id ?? null; }
    async download(id: string) { return this.files.find(file => file.id === id)?.content ?? null; }
    async upload(name: string, parent: string, content: string, id?: string | null) {
        const existing = id ? this.files.find(file => file.id === id) : undefined;
        if (existing) { existing.content = content; return existing.id; }
        return this.add(name, parent, content).id;
    }
    async children(parent: string) { return this.files.filter(file => file.parent === parent).map(file => ({ id: file.id, name: file.name })); }
}

const FOLDER = "LD 总结";
const record = (summary: string) => ({ summary, timestamp: "2026-10-03T00:00:00.000Z", model: "m", renderMode: "markdown" as const });

describe("DriveSync index safety", () => {
    let drive: FakeDrive;
    let root: FakeFile;

    beforeEach(() => {
        drive = new FakeDrive();
        root = drive.add(FOLDER, null);
        drive.add("topics", root.id);
        Summaries.set("200", [record("local B")]);
    });

    test("pushing a topic keeps every entry already in the cloud index", async () => {
        drive.add(INDEX_FILE, root.id, JSON.stringify({ version: 3, topics: { 100: { fileName: "topic-100.json", fileId: "x", entryCount: 2 } } }));
        await new DriveSync(drive as unknown as DriveClient, FOLDER).pushTopics(["200"]);
        const index = JSON.parse(drive.byName(INDEX_FILE)!.content);
        expect(Object.keys(index.topics).sort()).toEqual(["100", "200"]);
        expect(index.topics["100"].entryCount).toBe(2);
        expect(JSON.parse(drive.byName("topic-200.json")!.content).history[0].summary).toBe("local B");
    });

    test("history kept only in the legacy single file is carried into the new shard", async () => {
        drive.add(LEGACY_FILE, root.id, JSON.stringify({ 200: [{ summary: "legacy A", timestamp: "2025-01-01T00:00:00.000Z", model: "old" }] }));
        await new DriveSync(drive as unknown as DriveClient, FOLDER).pushTopics(["200"]);
        const shard = JSON.parse(drive.byName("topic-200.json")!.content);
        expect(shard.history.map((item: { summary: string }) => item.summary).sort()).toEqual(["legacy A", "local B"]);
        expect(JSON.parse(drive.byName(LEGACY_FILE)!.content)[200]).toHaveLength(1);
    });

    test("an empty or unrecognized cloud index is never overwritten", async () => {
        for (const content of ["", "   ", JSON.stringify({ version: 9, items: { 100: {} } })]) {
            drive = new FakeDrive();
            root = drive.add(FOLDER, null);
            drive.add("topics", root.id);
            const index = drive.add(INDEX_FILE, root.id, content);
            const error = await new DriveSync(drive as unknown as DriveClient, FOLDER).pushTopics(["200"]).catch((reason: unknown) => reason);
            expect(String(error)).toContain("已停止覆盖");
            expect(index.content).toBe(content);
        }
    });
});
