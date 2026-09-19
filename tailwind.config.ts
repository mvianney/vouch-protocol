import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─── Colors ───────────────────────────────────────────────────────────
      colors: {
        // Background layers — near-black with subtle purple tint
        void: {
          DEFAULT: "#0a0a0f",
          1: "#0e0e17",
          2: "#12121e",
          3: "#181827",
          4: "#1e1e32",
        },
        // Purple — primary accent
        purple: {
          faint: "rgba(109, 90, 194, 0.06)",
          dim: "#2a2250",
          muted: "#4338ca",
          DEFAULT: "#6d5ac2",
          bright: "#8b73e0",
          glow: "rgba(109, 90, 194, 0.35)",
        },
        // Teal — verified / success / positive delta only
        teal: {
          faint: "rgba(45, 212, 191, 0.08)",
          dim: "#0f766e",
          DEFAULT: "#2dd4bf",
          bright: "#5eead4",
        },
        // Negative / error
        red: {
          faint: "rgba(239, 68, 68, 0.08)",
          dim: "#7f1d1d",
          DEFAULT: "#ef4444",
          bright: "#f87171",
        },
        // Text scale
        text: {
          primary: "#eeebff",
          secondary: "#9b93d4",
          muted: "#5b5490",
          dim: "#2e2b4a",
        },
        // Border scale
        border: {
          faint: "rgba(109, 90, 194, 0.1)",
          dim: "rgba(109, 90, 194, 0.18)",
          DEFAULT: "rgba(109, 90, 194, 0.28)",
          bright: "rgba(109, 90, 194, 0.55)",
        },
      },

      // ─── Typography ───────────────────────────────────────────────────────
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "'Fira Code'", "monospace"],
      },

      // ─── Font sizes ───────────────────────────────────────────────────────
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },

      // ─── Spacing extras ───────────────────────────────────────────────────
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "128": "32rem",
        "160": "40rem",
      },

      // ─── Backgrounds ──────────────────────────────────────────────────────
      backgroundImage: {
        "grid-subtle": [
          "linear-gradient(rgba(109,90,194,0.04) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(109,90,194,0.04) 1px, transparent 1px)",
        ].join(", "),
        "purple-radial":
          "radial-gradient(ellipse 60% 50% at 50% -10%, rgba(109,90,194,0.18) 0%, transparent 70%)",
        "card-shine":
          "linear-gradient(135deg, rgba(109,90,194,0.05) 0%, transparent 50%)",
      },
      backgroundSize: {
        grid: "48px 48px",
      },

      // ─── Box shadows ──────────────────────────────────────────────────────
      boxShadow: {
        "purple-sm": "0 0 0 1px rgba(109,90,194,0.3)",
        "purple-md":
          "0 0 0 1px rgba(109,90,194,0.3), 0 4px 24px rgba(109,90,194,0.12)",
        "purple-lg":
          "0 0 0 1px rgba(109,90,194,0.4), 0 8px 40px rgba(109,90,194,0.2)",
        "teal-sm": "0 0 0 1px rgba(45,212,191,0.3)",
        "inset-purple": "inset 0 1px 0 rgba(109,90,194,0.15)",
      },

      // ─── Animations ───────────────────────────────────────────────────────
      keyframes: {
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "blink-caret": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        pulse: "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "blink-caret": "blink-caret 1.1s step-end infinite",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
