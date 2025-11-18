// React
import * as React from "react";
import { createRoot } from "react-dom/client";

// External libraries
import browser from "webextension-polyfill";

// Internal - components
import { AWSProfilesPopup } from "./awsProfiles";

// Styles
import "@cloudscape-design/global-styles/index.css";

/**
 * Initialize the popup UI
 */
(async () => {
    await browser.tabs.query({ active: true, currentWindow: true });
    const container = document.getElementById("popup");
    if (container) {
        const root = createRoot(container);
        root.render(<AWSProfilesPopup />);
    }
})();
