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
        // Tints use Tailwind's opacity modifier (e.g. text-navy/70, bg-gold/15).
        white: "#FFFFFF",
        navy: {
          DEFAULT: "#1a2744",
          deep: "#0E1A33",
        },
        gold: "#D4B254",
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
