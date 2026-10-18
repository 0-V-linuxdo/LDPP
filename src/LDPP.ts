/*
 * LD++, a modification for linux.do
 * Copyright (c) 2026 LD++ Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./components/core.css";

import { initDataStores } from "@api/DataStore";
import { startNavigation } from "@api/Navigation";
import { registerPlugin, startAllPlugins } from "@api/PluginManager";
import { initSettings } from "@api/Settings";
import { startTopicList } from "@api/TopicList";
import { onReady } from "@utils/dom";
import { Logger } from "@utils/Logger";
import { StartAt } from "@utils/types";

import Plugins from "~plugins";

export * as AI from "@api/AI";
export * as DataStore from "@api/DataStore";
export { closeAllDialogs, confirmDialog, openDialog } from "@api/Dialog";
export { dispatch, subscribe } from "@api/Events";
export { currentRoute } from "@api/Navigation";
export { showToast } from "@api/Notifications";
export { isPluginEnabled, plugins, setPluginEnabled, startPlugin, stopPlugin } from "@api/PluginManager";
export { PlainSettings, Settings, SettingsStore } from "@api/Settings";
export * as TopicList from "@api/TopicList";

const logger = new Logger("Core", "#f9d77e");

let initialized = false;

export const version = VERSION;

export function init() {
    if (initialized) return;
    initialized = true;
    initSettings();
    initDataStores();
    for (const plugin of Object.values(Plugins)) registerPlugin(plugin);
    startAllPlugins(StartAt.Init);
    onReady(() => {
        startNavigation();
        startTopicList();
        startAllPlugins(StartAt.DOMContentLoaded);
        logger.info(`LD++ ${VERSION} 已加载，${Object.keys(Plugins).length} 个模块`);
    });
}
