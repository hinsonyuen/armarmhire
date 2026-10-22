import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#FFFFFF", // pure white — Autodesk's guidance leads with white/black, not soft neutrals
        card: "#FFFFFF",
        text: {
          DEFAULT: "#1A1A1A",
          muted: "#6B6B6B",
          faint: "#9B9B9B",
        },
        border: "#E5E5E5",
        brand: {
          DEFAULT: "#111111", // near-black accent
          dark: "#333333", // hover state — lighter than the near-black default
          light: "#EDEDED", // subtle backgrounds/badges/avatar circles
          ink: "#1A1A1A", // dark text used on light-gray brand backgrounds
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "system-ui", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 0 0 1px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
