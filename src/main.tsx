import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App";
import "./index.css";
import { applyLookPrefs } from "./lib/lookPrefs";

try {
  applyLookPrefs();
} catch (e) {
  console.warn("Could not apply look preferences:", e);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Critical: #root element not found in index.html");
} else {
  const root = createRoot(rootElement);
  root.render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );
}
