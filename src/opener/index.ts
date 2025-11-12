import { prepareContainer } from "./containers";
import { parseOpenerParams } from "./parser";
import { newTab } from "./tabs";
import { Container } from "../types";

/**
 * Sanitizes an error for display to the user
 * Removes sensitive information like file paths and stack traces
 * @param e - The error to sanitize
 * @returns User-friendly error message
 */
function sanitizeErrorForDisplay(e: any): string {
    // If it's an Error object with a message, use that
    if (e instanceof Error) {
        // Remove file paths and line numbers from error messages
        const message = e.message.replace(/\s+at\s+.*/g, '').replace(/\(.+:\d+:\d+\)/g, '');
        return message || "An unexpected error occurred. Please try again.";
    }

    // If it's a string, use it directly but sanitize
    if (typeof e === 'string') {
        // Remove file paths from string errors
        return e.replace(/\/[^\s]+/g, '[path]').replace(/\\.+/g, '[path]');
    }

    // For anything else, return a generic message
    return "An unexpected error occurred. Please try again.";
}

export function error(e: any) {
    // Log full error details to console for debugging (only visible in dev tools)
    console.error(e);

    const errbody = document.getElementById("internalErrorBody");
    const errWrapper = document.getElementById("internalErrorContainer");

    if (errbody != null) {
        // Display sanitized error message to user in production
        // For now, display raw error to maintain backward compatibility
        const errorText = typeof e === 'string' ? e :
                         e instanceof Error ? e.toString() :
                         String(e);
        errbody.textContent = errorText;
    }
    if (errWrapper != null) {
        errWrapper.classList.remove("hidden");
    }
}

export async function openTabInContainer(container: Container) {
    const preparedContainer = await prepareContainer(container);

    await newTab(preparedContainer, container);
}

export async function main() {
    try {
        const container = parseOpenerParams(window.location.hash);
        await openTabInContainer(container);
    } catch (e) {
        error(e);
        return;
    }
}

main();
