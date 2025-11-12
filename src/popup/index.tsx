import * as React from "react";
import { createRoot } from "react-dom/client";
import browser from "webextension-polyfill";
import { AWSProfilesPopup } from "./awsProfiles";
import "@cloudscape-design/global-styles/index.css";

browser.tabs.query({ active: true, currentWindow: true }).then(() => {
    const container = document.getElementById("popup");
    if (container) {
        const root = createRoot(container);
        root.render(<AWSProfilesPopup />);
    }
});
