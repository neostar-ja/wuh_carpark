import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-prompt)", "system-ui", "sans-serif"],
      },
      colors: {
        wuh: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdcff",
          300: "#8ec4ff",
          400: "#59a4ff",
          500: "#3183fb",
          600: "#1a63f0",
          700: "#164ddd",
          800: "#0b5ea8",
          900: "#0a3a66",
          950: "#082749",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(10, 58, 102, 0.06), 0 8px 24px -8px rgba(10, 58, 102, 0.18)",
        "card-hover": "0 2px 4px rgba(10, 58, 102, 0.08), 0 16px 32px -12px rgba(10, 58, 102, 0.24)",
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "scale-in": "scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
