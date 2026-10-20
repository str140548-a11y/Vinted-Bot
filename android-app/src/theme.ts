/**
 * App theme. Dark-first palette inspired by modern shopping dashboards, with a
 * light variant. Colors are resolved via useColorScheme() in components.
 */
export const palette = {
  brand: "#18b35e",
  brandDark: "#0c9049",
  brandSoft: "rgba(24,179,94,0.15)",
};

export const dark = {
  bg: "#0b1120",
  card: "#131a2b",
  cardAlt: "#1b2439",
  border: "#232c42",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  brand: palette.brand,
  brandSoft: palette.brandSoft,
  danger: "#f87171",
  warn: "#fbbf24",
  info: "#60a5fa",
  tabBar: "#0e1526",
};

export const light = {
  bg: "#f8fafc",
  card: "#ffffff",
  cardAlt: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  brand: palette.brandDark,
  brandSoft: "rgba(12,144,73,0.1)",
  danger: "#dc2626",
  warn: "#d97706",
  info: "#2563eb",
  tabBar: "#ffffff",
};

export type Theme = typeof dark;

export const radius = { sm: 8, md: 12, lg: 16, xl: 20 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
