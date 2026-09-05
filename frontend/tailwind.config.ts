import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050507",
        graphite: "#10121A",
        line: "rgba(255,255,255,0.08)",
        gold: "#7C6CFF",
        ember: "#48E0FF",
        ivory: "#F7F8FA",
        muted: "#A6A9B4",
        success: "#32D583",
        warning: "#F7B955",
        danger: "#FF5D73",
      },
      boxShadow: {
        glow: "0 0 80px rgba(109,93,251,0.20)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
} satisfies Config;
