import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        surface: "#101114",
        panel: "#181A1F",
        border: "#2B2F38",
        // Softer graphite/slate surfaces inspired by the dashboard reference.
        // Accent colors (teal, violet, amber, etc.) remain unchanged.
        slate: {
          50: "#f2f3f6",
          100: "#e7e9ee",
          200: "#d5d8e0",
          300: "#b7bdc9",
          400: "#9ba3b2",
          500: "#7f8798",
          600: "#626b7d",
          700: "#484f60",
          800: "#373d4c",
          900: "#2f3442",
          950: "#282d3a",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
