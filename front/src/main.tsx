import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const STORAGE_KEY = "convertia-store";

function initializeTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const darkMode = parsed.state?.darkMode;
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return;
    }

    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }
  } catch {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }
  }
}

initializeTheme();

createRoot(document.getElementById("root")!).render(<App />);
