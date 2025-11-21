/**
 * Container Management Utilities
 *
 * Provides centralized container operations for the AWS Profile Containers extension.
 * Handles container creation, lookup, updates, and storage management.
 */

import browser, { type ContextualIdentities } from "webextension-polyfill";
import { STORAGE_KEYS } from "@/constants";
import { isStringArray } from "@/types";

/**
 * Container color options available in Firefox
 */
export const CONTAINER_COLORS = [
    "blue",
    "turquoise",
    "green",
    "yellow",
    "orange",
    "red",
    "pink",
    "purple",
] as const;

export type ContainerColor = typeof CONTAINER_COLORS[number];

/**
 * Container icon options available in Firefox
 */
export const CONTAINER_ICONS = [
    "fingerprint",
    "briefcase",
    "dollar",
    "cart",
    "circle",
    "gift",
    "vacation",
    "food",
    "fruit",
    "pet",
    "tree",
    "chill",
] as const;

export type ContainerIcon = typeof CONTAINER_ICONS[number];

export const DEFAULT_ICON: ContainerIcon = "fingerprint";

/**
 * Looks up an existing container by name
 * @param name - The container name to search for
 * @returns The container if found, null otherwise
 */
export async function lookupContainer(
    name: string
): Promise<ContextualIdentities.ContextualIdentity | null> {
    try {
        const containers = await browser.contextualIdentities.query({ name });
        return containers.length >= 1 ? containers[0] : null;
    } catch (err) {
        console.error(`Failed to lookup container "${name}":`, err);
        return null;
    }
}

/**
 * Generates a hash code from a string
 * Used for consistent color generation
 * @param str - The string to hash
 * @returns A 32-bit integer hash code
 */
function hashCode(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Generates a consistent color for a container based on its name
 * Same name will always produce the same color
 * @param name - The container name
 * @returns A container color derived from the name hash
 */
export function colorFromContainerName(name: string): ContainerColor {
    const hash = Math.abs(hashCode(name));
    const index = hash % CONTAINER_COLORS.length;
    return CONTAINER_COLORS[index];
}

/**
 * Generates a random container color
 * @returns A random container color
 */
export function randomContainerColor(): ContainerColor {
    const index = Math.floor(Math.random() * CONTAINER_COLORS.length);
    return CONTAINER_COLORS[index];
}

/**
 * Prepares a container for use, creating it if necessary or updating if it exists
 * @param name - Container name
 * @param color - Container color (optional, will use hash-based color if not provided)
 * @param icon - Container icon (optional, will use default if not provided)
 * @returns The prepared container identity
 */
export async function prepareContainer(
    name: string,
    color?: string,
    icon?: string
): Promise<ContextualIdentities.ContextualIdentity> {
    try {
        const existingContainer = await lookupContainer(name);

        if (!existingContainer) {
            // Create new container
            const created = await browser.contextualIdentities.create({
                name,
                color: color || colorFromContainerName(name),
                icon: icon || DEFAULT_ICON,
            });
            await saveContainerId(created.cookieStoreId);
            return created;
        } else {
            // Update existing container if color or icon changed
            const needsUpdate =
                (color && color !== existingContainer.color) ||
                (icon && icon !== existingContainer.icon);

            if (needsUpdate) {
                await browser.contextualIdentities.update(existingContainer.cookieStoreId, {
                    color: color || existingContainer.color,
                    icon: icon || existingContainer.icon,
                });
            }

            return existingContainer;
        }
    } catch (err) {
        console.error(`Failed to prepare container "${name}":`, err);
        throw new Error(`Could not prepare container: ${err}`);
    }
}

/**
 * Saves a container ID to local storage
 * Maintains a list of all managed containers
 * @param id - The container cookie store ID to save
 */
export async function saveContainerId(id: string): Promise<void> {
    try {
        const data = await browser.storage.local.get(STORAGE_KEYS.CONTAINERS);

        let containers: string[] = [];
        if (STORAGE_KEYS.CONTAINERS in data && isStringArray(data.containers)) {
            containers = data.containers;
        }

        // Only add if not already present
        if (!containers.includes(id)) {
            await browser.storage.local.set({
                [STORAGE_KEYS.CONTAINERS]: [...containers, id],
            });
        }
    } catch (err) {
        console.error(`Failed to save container ID "${id}":`, err);
        throw new Error(`Could not save container ID: ${err}`);
    }
}

/**
 * Retrieves all managed container IDs from storage
 * @returns Array of container cookie store IDs
 */
export async function getManagedContainerIds(): Promise<string[]> {
    try {
        const data = await browser.storage.local.get(STORAGE_KEYS.CONTAINERS);

        if (STORAGE_KEYS.CONTAINERS in data && isStringArray(data.containers)) {
            return data.containers;
        }

        return [];
    } catch (err) {
        console.error("Failed to get managed container IDs:", err);
        return [];
    }
}

/**
 * Retrieves all managed containers
 * @returns Array of container identities
 */
export async function getManagedContainers(): Promise<ContextualIdentities.ContextualIdentity[]> {
    try {
        const [allIdentities, containerIds] = await Promise.all([
            browser.contextualIdentities.query({}),
            getManagedContainerIds(),
        ]);

        return allIdentities.filter((identity) =>
            containerIds.includes(identity.cookieStoreId)
        );
    } catch (err) {
        console.error("Failed to get managed containers:", err);
        return [];
    }
}

/**
 * Removes a container and its ID from storage
 * @param cookieStoreId - The container cookie store ID to remove
 */
export async function removeContainer(cookieStoreId: string): Promise<void> {
    try {
        // Remove the container itself
        await browser.contextualIdentities.remove(cookieStoreId);

        // Remove from storage
        const containerIds = await getManagedContainerIds();
        const updatedIds = containerIds.filter((id) => id !== cookieStoreId);

        await browser.storage.local.set({
            [STORAGE_KEYS.CONTAINERS]: updatedIds,
        });
    } catch (err) {
        console.error(`Failed to remove container "${cookieStoreId}":`, err);
        throw new Error(`Could not remove container: ${err}`);
    }
}

/**
 * Removes all managed containers
 */
export async function clearAllContainers(): Promise<void> {
    try {
        const containers = await getManagedContainers();

        // Remove all containers in parallel
        await Promise.all(
            containers.map((container) =>
                browser.contextualIdentities.remove(container.cookieStoreId)
            )
        );

        // Clear storage
        await browser.storage.local.set({
            [STORAGE_KEYS.CONTAINERS]: [],
        });
    } catch (err) {
        console.error("Failed to clear all containers:", err);
        throw new Error(`Could not clear containers: ${err}`);
    }
}
