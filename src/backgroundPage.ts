/**
 * Background page for the extension
 * Handles messages from the popup and other extension components
 */

import browser from "webextension-polyfill";

// Listen for messages sent from other parts of the extension
browser.runtime.onMessage.addListener((request: unknown) => {
    // Safely handle null/undefined requests
    if (!request || typeof request !== "object") {
        return;
    }

    const message = request as { popupMounted?: boolean };
    // Log statement if request.popupMounted is true
    // NOTE: this request is sent in `popup/component.tsx`
    if (message.popupMounted) {
        console.log("backgroundPage notified that Popup.tsx has mounted.");
    }
});
