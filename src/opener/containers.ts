import browser from "webextension-polyfill";
import { Container } from "../types";
import { CONTAINER_COLORS, DEFAULT_ICON } from "../constants";

/**
 * Generates a random color from available container colors
 * @returns A random container color
 */
function randomColor(): string {
    return CONTAINER_COLORS[
        (Math.random() * CONTAINER_COLORS.length) | 0
    ];
}

/**
 * Looks up an existing container by name
 * @param name - The container name to search for
 * @returns The container if found, null otherwise
 */
async function lookupContainer(name: string) {
    const containers = await browser.contextualIdentities.query({
        name: name,
    });

    if (containers.length >= 1) {
        return containers[0];
    }

    return null;
}

/**
 * Generates a hash code from a string
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
 * @param name - The container name
 * @returns A container color derived from the name hash
 */
export const colorFromContainerName = (name: string): string => {
    const hash = Math.abs(hashCode(name));
    const index = hash % (CONTAINER_COLORS.length - 1);
    return CONTAINER_COLORS[index];
};

/**
 * Prepares a container for use, creating it if necessary or updating if it exists
 * @param container - Container configuration
 * @returns The prepared container identity
 */
export async function prepareContainer({ name, color, icon }: Container) {
    const container = await lookupContainer(name);
    if (!container) {
        const created = await browser.contextualIdentities.create({
            name: name,
            color: color || colorFromContainerName(name),
            icon: icon || DEFAULT_ICON,
        });
        await saveContainerId(created.cookieStoreId);
        return created;
    } else {
        // update the existing container if the color or icon have changed
        await browser.contextualIdentities.update(container.cookieStoreId, {
            color: color || container.color,
            icon: icon || container.icon,
        });
    }

    return container;
}

/**
 * Saves a container ID to local storage
 * @param id - The container cookie store ID to save
 */
const saveContainerId = async (id: string): Promise<void> => {
    const obj = await browser.storage.local.get("containers");
    const exists = "containers" in obj;
    if (exists) {
        const containers = (obj.containers as string[]) || [];
        await browser.storage.local.set({
            containers: [...containers, id],
        });
    } else {
        await browser.storage.local.set({ containers: [id] });
    }
};
