import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          500: "#1e6fd9",
          600: "#155cb8",
          700: "#0f4a96",
          900: "#0a2a55",
        },
        accent: {
          500: "#f59e0b",
          600: "#d97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      container: {
        center: true,
        padding: "1rem",
        screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1200px" },
      },
    },
  },
  plugins: [],
};

export default config;
