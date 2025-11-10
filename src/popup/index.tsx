import * as React from "react";
import * as ReactDOM from "react-dom";
import { browser } from "webextension-polyfill-ts";
import { AWSProfilesPopup } from "./awsProfiles";
// import "../scss/app.scss";

browser.tabs.query({ active: true, currentWindow: true }).then(() => {
    ReactDOM.render(<AWSProfilesPopup />, document.getElementById("popup"));
});
