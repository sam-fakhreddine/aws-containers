/**
 * Background page for the extension
 * Handles messages from the popup and other extension components
 */

import browser from "webextension-polyfill";

// Track active listeners to prevent duplicates
let messageListenerRegistered = false;

function handleMessage(request: unknown) {
    if (!request || typeof request !== "object") {
        return;
    }

    const message = request as { popupMounted?: boolean };
    if (message.popupMounted) {
        // Popup has mounted - no action needed
    }
}

// Register listener only once
if (!messageListenerRegistered) {
    browser.runtime.onMessage.addListener(handleMessage);
    messageListenerRegistered = true;
}
