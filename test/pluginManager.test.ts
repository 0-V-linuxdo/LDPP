/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { describe, expect, test } from "bun:test";

import { subscribe } from "../src/api/Events";
import { isPluginEnabled, plugins, registerPlugin, setPluginEnabled, startPlugin } from "../src/api/PluginManager";
import definePlugin from "../src/utils/types";

const log: string[] = [];

function fake(name: string, dependencies?: string[]) {
    registerPlugin(definePlugin({
        name,
        displayName: name,
        description: name,
        dependencies,
        enabledByDefault: true,
        start() { log.push(`start ${name}`); },
        stop() { log.push(`stop ${name}`); },
    }));
}

describe("PluginManager dependencies", () => {
    fake("Base");
    fake("Middle", ["Base"]);
    fake("Leaf", ["Middle"]);

    test("disabling a dependency disables and stops every dependent, re-enabling a dependent brings its chain back", () => {
        const toggles: string[] = [];
        const off = subscribe("pluginToggle", ({ name, enabled }) => toggles.push(`${name}:${enabled}`));
        startPlugin(plugins.Leaf);
        expect([plugins.Base.started, plugins.Middle.started, plugins.Leaf.started]).toEqual([true, true, true]);

        log.length = 0;
        setPluginEnabled("Base", false);
        expect(log).toEqual(["stop Leaf", "stop Middle", "stop Base"]);
        expect(["Base", "Middle", "Leaf"].map(isPluginEnabled)).toEqual([false, false, false]);
        expect(toggles).toEqual(["Middle:false", "Leaf:false", "Base:false"]);

        log.length = 0;
        toggles.length = 0;
        setPluginEnabled("Leaf", true);
        expect(log).toEqual(["start Base", "start Middle", "start Leaf"]);
        expect(["Base", "Middle", "Leaf"].map(isPluginEnabled)).toEqual([true, true, true]);
        expect(toggles).toEqual(["Middle:true", "Base:true", "Leaf:true"]);

        log.length = 0;
        toggles.length = 0;
        setPluginEnabled("Middle", false);
        expect(log).toEqual(["stop Leaf", "stop Middle"]);
        expect(plugins.Base.started).toBe(true);
        expect(toggles).toEqual(["Leaf:false", "Middle:false"]);
        off();
    });
});
