/**
 * Container operations for the opener page
 * Uses centralized container management utilities
 */

import { Container } from "@/types";
import {
    prepareContainer as prepareContainerUtil,
    CONTAINER_COLORS,
    DEFAULT_ICON,
    colorFromContainerName,
} from "@/utils/containerManager";

// Re-export utilities for backwards compatibility
export { colorFromContainerName, CONTAINER_COLORS, DEFAULT_ICON };

/**
 * Prepares a container for use, creating it if necessary or updating if it exists
 * @param container - Container configuration
 * @returns The prepared container identity
 */
export async function prepareContainer({ name, color, icon }: Container) {
    return prepareContainerUtil(name, color, icon);
}
