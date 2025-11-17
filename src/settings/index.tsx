import React from "react";
import { createRoot } from "react-dom/client";
import { Settings } from "./settings";
import "@cloudscape-design/global-styles/index.css";

const container = document.getElementById("root");
if (container) {
    const root = createRoot(container);
    root.render(<Settings />);
}
