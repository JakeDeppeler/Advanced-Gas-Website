import type { Config } from "tailwindcss";

// Brand palette extracted from the Advanced Gas & Aircon logo.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy (the "Advanced" wordmark)
        navy: {
          50: "#eef0f8",
          100: "#d6daec",
          200: "#aeb6da",
          300: "#7e89bf",
          400: "#5462a3",
          500: "#384688",
          600: "#27336d",
          700: "#1d2755",
          800: "#152045",
          900: "#0E1638", // primary navy
          950: "#070b1f",
        },
        // Bright cyan (the "Gas & Aircon" wordmark + droplet)
        cyan: {
          50: "#e7f7fe",
          100: "#c6ecfc",
          200: "#8eddf9",
          300: "#52cbf5",
          400: "#1AAEE6", // brand bright blue
          500: "#0e96cd",
          600: "#0a7aa8",
          700: "#0a6286",
          800: "#0d506d",
          900: "#0f425a",
        },
        // Orange flame (top of logo)
        flame: {
          50: "#fef2ec",
          100: "#fde0d1",
          200: "#fbbfa1",
          300: "#f99467",
          400: "#f56a37",
          500: "#ED5C25", // brand orange
          600: "#cf4515",
          700: "#a83514",
          800: "#882d18",
          900: "#702817",
        },
        // Red dot
        signal: {
          500: "#E1373F",
          600: "#c2202a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(14 22 56 / 0.04), 0 8px 24px -8px rgb(14 22 56 / 0.08)",
        cardHover: "0 4px 8px 0 rgb(14 22 56 / 0.06), 0 24px 48px -16px rgb(14 22 56 / 0.18)",
        glow: "0 0 0 1px rgb(26 174 230 / 0.2), 0 16px 48px -12px rgb(26 174 230 / 0.4)",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 75% 80%, rgba(26,174,230,0.06) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(26,174,230,0.25), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(237,92,37,0.18), transparent 60%)",
      },
      container: {
        center: true,
        padding: "1.25rem",
        screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1240px" },
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "fade-in": "fadeIn 0.6s ease-out both",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
