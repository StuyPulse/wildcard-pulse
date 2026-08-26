import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        stuypulse: {
          bg: "#0F1113",
          surface: "#1C1F23",
          elevated: "#26292E",
          red: "#8C1D1D",
          redHover: "#C23B3B",
          redPressed: "#5C1212",
          text: "#EDEDEF",
          textMuted: "#9A9DA3",
          border: "#2E3136",
          success: "#3FA65A",
          warning: "#D9A441",
          error: "#D94141",
        },
      },
      borderRadius: { panel: "10px" },
      boxShadow: {
        panel: "0 8px 24px rgb(0 0 0 / 0.14)",
        elevated: "0 16px 36px rgb(0 0 0 / 0.22)",
        status: "0 0 0 3px rgb(63 166 90 / 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
