import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import { App } from "./app";
import { applyTheme, HOME_HUE } from "./lib/theme";

// Before first render, so there's no flash of an unthemed page
applyTheme(HOME_HUE);

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
