/**
 * Options Entrypoint - WXT Framework
 * Main entry point for the extension settings/options page
 */

// React
import React from "react";
import { createRoot } from "react-dom/client";

// Cloudscape Design System - Global styles must be imported in entrypoint
import "@cloudscape-design/global-styles/index.css";

// Internal - components
import { Settings } from "../../src/settings/settings";

/**
 * Initialize the options/settings UI
 */
(() => {
    // Get the root container element
    const container = document.getElementById("root");
    
    if (container) {
        // Create React root and render the settings component
        const root = createRoot(container);
        root.render(<Settings />);
    } else {
        console.error("Failed to find root element for options page");
    }
})();
