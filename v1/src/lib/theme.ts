export const APP_THEMES = ["light", "dark", "pink", "cozy"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const THEME_STORAGE_KEY = "dojang-theme";

export const THEME_META: Record<
  AppTheme,
  { label: string; themeColor: string }
> = {
  light: { label: "라이트", themeColor: "#8066e8" },
  dark: { label: "다크", themeColor: "#1a1625" },
  pink: { label: "핑크", themeColor: "#ff6fa5" },
  cozy: { label: "코지", themeColor: "#c4784a" },
};

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return APP_THEMES.includes(value as AppTheme);
}

/** Prevents theme flash before React hydrates. Safe to call from Server Components. */
export function themeInitScript() {
  return `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t!=='dark'&&t!=='light'&&t!=='pink'&&t!=='cozy')t='light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();`;
}
