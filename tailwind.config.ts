import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A8A",
        "on-primary": "#FFFFFF",
        secondary: "#0284C7",
        "on-secondary": "#131313",
        accent: "#2563EB",
        success: "#15803D",
        "on-success": "#FFFFFF",
        error: "#B91C1C",
        "on-error": "#FFFFFF",
        warning: "#B45309",
        "on-warning": "#FFFFFF",
        "light-surface": "#F8FAFC",
        "light-surface-card": "#FFFFFF",
        "light-on-surface": "#0F172A",
        "light-on-surface-muted": "#64748B",
        "light-outline": "#CBD5E1",
        "light-outline-focus": "#2563EB",
        "dark-surface": "#0F172A",
        "dark-surface-card": "#1E293B",
        "dark-on-surface": "#F8FAFC",
        "dark-on-surface-muted": "#94A3B8",
        "dark-outline": "#334155",
        "dark-outline-focus": "#60A5FA",
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
        full: "9999px",
      },
      fontFamily: {
        display: ['"Red Hat Text"', "sans-serif"],
        headline: ['"Red Hat Text"', "sans-serif"],
        body: ['"Lato"', "sans-serif"],
        label: ['"Red Hat Text"', "sans-serif"],
        mono: ['"Red Hat Mono"', "monospace"],
      },
      fontSize: {
        "display-lg": ["36px", { lineHeight: "44px", letterSpacing: "-0.5px", fontWeight: "700" }],
        "headline-lg": ["24px", { lineHeight: "32px", letterSpacing: "-0.2px", fontWeight: "700" }],
        "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-sm": ["16px", { lineHeight: "24px", fontWeight: "600" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", fontWeight: "400" }],
        "label-lg": ["14px", { lineHeight: "20px", fontWeight: "600" }],
        "label-md": ["12px", { lineHeight: "16px", fontWeight: "600" }],
        "mono-sm": ["12px", { lineHeight: "16px", fontWeight: "500" }],
      },
    },
  },
  plugins: [forms],
};

export default config;
