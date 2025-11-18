/**
 * Tab management utilities for Firefox extension
 */

import browser, { type ContextualIdentities, type Tabs } from "webextension-polyfill";

/**
 * Requests tabs permission if not already granted
 * @returns Promise<boolean> - true if permission granted
 */
export async function requestTabsPermission(): Promise<boolean> {
    try {
        return await browser.permissions.request({
            permissions: ["tabs"]
        });
    } catch (e) {
        console.error("Failed to request tabs permission:", e);
        return false;
    }
}

/**
 * Ensures tabs permission is granted, requesting if needed
 * @throws Error if permission not granted
 */
async function ensureTabsPermission(): Promise<void> {
    const hasPermission = await browser.permissions.contains({ permissions: ["tabs"] });
    if (!hasPermission) {
        const granted = await requestTabsPermission();
        if (!granted) {
            throw new Error("Tabs permission required");
        }
    }
}

/**
 * Creates a new tab in a specified container and closes the current tab
 * @param container - The contextual identity (container) to open the tab in
 * @param params - Parameters for the new tab
 * @throws Error if tab creation fails
 */
export async function newTab(
    container: ContextualIdentities.ContextualIdentity,
    params: { url: string },
): Promise<void> {
    await ensureTabsPermission();
    try {
        const currentTab = await browser.tabs.getCurrent();

        const createTabParams = {
            cookieStoreId: container.cookieStoreId,
            url: params.url,
            index: currentTab.index + 1,
        };

        await browser.tabs.create(createTabParams);
        if (currentTab.id) {
            await browser.tabs.remove(currentTab.id);
        }
    } catch (e) {
        throw new Error(`creating new tab: ${e}`);
    }
}

/**
 * Closes the current tab
 */
export async function closeCurrentTab(): Promise<void> {
    await ensureTabsPermission();
    const currentTab = await browser.tabs.getCurrent();
    if (currentTab.id) {
        await browser.tabs.remove(currentTab.id);
    }
}

/**
 * Gets the currently active tab in the current window
 * @returns The active tab
 */
export async function getActiveTab(): Promise<Tabs.Tab> {
    await ensureTabsPermission();
    const tabs = await browser.tabs.query({
        active: true,
        windowId: browser.windows.WINDOW_ID_CURRENT,
    });
    return tabs[0];
}
