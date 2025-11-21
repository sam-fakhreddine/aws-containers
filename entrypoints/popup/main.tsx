/**
 * Popup Entrypoint - WXT Framework
 * Main entry point for the extension popup
 */

// React
import React from "react";
import { createRoot } from "react-dom/client";

// External libraries
import browser from "webextension-polyfill";

// Cloudscape Design System - Global styles must be imported in entrypoint
import "@cloudscape-design/global-styles/index.css";

// Internal - components
import { AWSProfilesPopup } from "../../src/popup/awsProfiles";

/**
 * Initialize the popup UI
 */
(async () => {
    // Query active tab (for context, though not strictly needed for popup)
    await browser.tabs.query({ active: true, currentWindow: true });
    
    // Get the root container element
    const container = document.getElementById("root");
    
    if (container) {
        // Create React root and render the popup component
        const root = createRoot(container);
        root.render(<AWSProfilesPopup />);
    } else {
        console.error("Failed to find root element for popup");
    }
})();
