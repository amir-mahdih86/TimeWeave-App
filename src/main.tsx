import { createRoot } from "react-dom/client";
import "@fontsource-variable/outfit/wght.css";
import "@fontsource-variable/plus-jakarta-sans/wght.css";
import App from "./App";
import "./index.css";

// Inside the Tauri app the frontend is embedded and offline by design.
// Remove any service worker left over from an older PWA-based build so a
// stale precache can never shadow freshly shipped bundles.
if ("__TAURI_INTERNALS__" in window && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => void reg.unregister());
  });
  if ("caches" in window) {
    caches.keys().then(keys => {
      keys.forEach(key => void caches.delete(key));
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
