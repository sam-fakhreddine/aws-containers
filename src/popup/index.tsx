import * as React from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import { AWSProfilesPopup } from "./awsProfiles";
import "@cloudscape-design/global-styles/index.css";

browser.tabs.query({ active: true, currentWindow: true }).then(() => {
    const container = document.getElementById("popup");
    if (container) {
        // Apply Cloudscape theme to the container
        container.setAttribute('data-awsui-theme', 'default');
        const root = createRoot(container);
        root.render(<AWSProfilesPopup />);
    }
});
