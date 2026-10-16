import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
      colors: {
        surface: "#090811",
        panel: "#11101b",
        border: "#2b2838",
        // Shared LumenVec identity; semantic warning/error colors stay distinct.
        teal: { 100: "#d6f7fa", 200: "#a8edf3", 300: "#56d8e4", 400: "#37becd", 500: "#2199aa" },
        slate: {
          50: "#f5f0e9",
          100: "#eee9f4",
          200: "#d9d4e4",
          300: "#c1bbd0",
          400: "#aaa6b8",
          500: "#928bA4",
          600: "#686078",
          700: "#3c354d",
          800: "#2b2838",
          900: "#171525",
          950: "#090811",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
