import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f4f7fb",
        line: "#d9e2ec",
        sea: "#005f73",
        amber: "#b45309",
        moss: "#3f6212",
        coral: "#b42318"
      },
      boxShadow: {
        soft: "0 18px 40px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        sans: ["'Avenir Next'", "Avenir", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'SFMono-Regular'", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};

export default config;
