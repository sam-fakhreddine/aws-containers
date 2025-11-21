/**
 * Background page for the extension
 * Handles messages from the popup and other extension components
 * Migrated from src/backgroundPage.ts to WXT format
 */

export default defineBackground(() => {
  // Track active listeners to prevent duplicates
  let messageListenerRegistered = false;

  function handleMessage(request: unknown) {
    if (!request || typeof request !== "object") {
      return;
    }

    const message = request as { popupMounted?: boolean; popupUnmounted?: boolean };
    if (message.popupMounted) {
      console.log("backgroundPage notified that Popup.tsx has mounted.");
    }
    if (message.popupUnmounted) {
      console.log("backgroundPage notified that Popup.tsx has unmounted.");
    }
  }

  // Register listener only once
  if (!messageListenerRegistered) {
    browser.runtime.onMessage.addListener(handleMessage);
    messageListenerRegistered = true;
  }
});
