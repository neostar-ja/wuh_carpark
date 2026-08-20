import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wuh: {
          blue: "#0b5ea8",
          navy: "#0a3a66",
        },
      },
    },
  },
  plugins: [],
};

export default config;
