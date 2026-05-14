import type { Config } from "tailwindcss";

// Brand palette from Advanced Gas & Aircon design system.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep navy
        navy: {
          50: "#eef0f8",
          100: "#d6daec",
          200: "#aeb6da",
          300: "#7e89bf",
          400: "#5462a3",
          500: "#384688",
          600: "#1b234e",
          700: "#0f1747",
          800: "#0b1450",
          900: "#050a30", // design --navy
          950: "#02061a",
        },
        // Bright cyan (sky)
        cyan: {
          50: "#e7f7fe",
          100: "#c6ecfc",
          200: "#8eddf9",
          300: "#52cbf5",
          400: "#2cc5ff",
          500: "#00b0ed", // design --sky
          600: "#0a90c4",
          700: "#0b7299",
          800: "#0d506d",
          900: "#0f425a",
        },
        // Orange flame
        flame: {
          50: "#fef2ec",
          100: "#fde0d1",
          200: "#fbbfa1",
          300: "#f99467",
          400: "#ff7a36",
          500: "#f36722", // design --orange
          600: "#c14a13",
          700: "#a83514",
          800: "#882d18",
          900: "#702817",
        },
        // Red signal
        signal: {
          500: "#ec1c22",
          600: "#c2202a",
        },
        // Warm neutrals — the design's distinctive cream background
        warm: {
          50: "#faf8f3",  // bg
          100: "#f3efe5", // bg-2
          200: "#ebe6d8", // line
          300: "#d8d2c1", // line-2
        },
        ink: {
          DEFAULT: "#1a1a1d",
          2: "#4a4a52",
          3: "#7a7a82",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(5 10 48 / 0.04), 0 8px 24px -8px rgb(5 10 48 / 0.08)",
        cardHover: "0 4px 8px 0 rgb(5 10 48 / 0.06), 0 24px 48px -16px rgb(5 10 48 / 0.18)",
        glow: "0 0 0 1px rgb(0 176 237 / 0.2), 0 16px 48px -12px rgb(0 176 237 / 0.4)",
        chunky: "0 4px 0 #000",
        chunkyOrange: "0 4px 0 #c14a13",
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.08) 1px, transparent 1px), radial-gradient(circle at 75% 80%, rgba(0,176,237,0.06) 1px, transparent 1px)",
        "hero-glow":
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(0,176,237,0.18), transparent 60%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(243,103,34,0.16), transparent 60%)",
      },
      container: {
        center: true,
        padding: "1.25rem",
        screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px" },
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out both",
        "fade-in": "fadeIn 0.6s ease-out both",
        "pulse-dot": "pulseDot 2.4s ease-in-out infinite",
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
        pulseDot: {
          "50%": { boxShadow: "0 0 0 8px rgb(236 28 34 / 0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
