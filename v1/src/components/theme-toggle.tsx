"use client";

import { useSyncExternalStore } from "react";
import {
  APP_THEMES,
  THEME_META,
  THEME_STORAGE_KEY,
  isAppTheme,
  type AppTheme,
} from "@/lib/theme";

function readTheme(): AppTheme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isAppTheme(saved) ? saved : "light";
}

function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", THEME_META[theme].themeColor);
  }
  window.dispatchEvent(new Event("dojang-theme"));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("dojang-theme", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("dojang-theme", onStoreChange);
  };
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as AppTheme);

  return (
    <div className="theme-switch" role="group" aria-label="테마 선택">
      {APP_THEMES.map((choice) => {
        const selected = theme === choice;
        return (
          <button
            key={choice}
            type="button"
            className="theme-switch__btn"
            data-theme-choice={choice}
            aria-pressed={selected}
            aria-label={`${THEME_META[choice].label} 테마`}
            title={THEME_META[choice].label}
            onClick={() => applyTheme(choice)}
          >
            <span className="visually-hidden">{THEME_META[choice].label}</span>
          </button>
        );
      })}
    </div>
  );
}
