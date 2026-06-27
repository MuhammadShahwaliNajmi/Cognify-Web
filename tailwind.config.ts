import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cognify — strict three-color system. Nothing else.
        white: "#FFFFFF",
        navy: {
          DEFAULT: "#1a2744",
          deep: "#0E1A33",
          // tints derived from navy, for de-emphasised text / hairlines ONLY
          70: "rgba(26,39,68,0.70)",
          55: "rgba(26,39,68,0.55)",
          40: "rgba(26,39,68,0.40)",
          20: "rgba(26,39,68,0.20)",
          12: "rgba(26,39,68,0.12)",
          8: "rgba(26,39,68,0.08)",
        },
        gold: {
          DEFAULT: "#C9A94B",
          40: "rgba(201,169,75,0.40)",
          20: "rgba(201,169,75,0.20)",
        },
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
      keyframes: {
        "pulse-node": {
          "0%, 100%": { opacity: "0.45", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.15)" },
        },
        "marquee-left": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "marquee-right": {
          from: { transform: "translateX(-50%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "pulse-node": "pulse-node 2.6s ease-in-out infinite",
        "marquee-left": "marquee-left 32s linear infinite",
        "marquee-right": "marquee-right 36s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
