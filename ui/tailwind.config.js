const defaultTheme = require("tailwindcss/defaultTheme");
const typography = require("@tailwindcss/typography");
const colors = require("tailwindcss/colors");


/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Geist", ...defaultTheme.fontFamily.sans],
      },
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        secondary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#020617",
        },
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        danger: {
          50: "#fef2f2",
          100: "#fee2e2",
          200: "#fecaca",
          300: "#fca5a5",
          400: "#f87171",
          500: "#ef4444",
          600: "#dc2626",
          700: "#b91c1c",
          800: "#991b1b",
          900: "#7f1d1d",
          950: "#450a0a",
        },
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03",
        },
      },
      keyframes: {
        pulse: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "50%": { transform: "scale(1.5)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "0.6" },
        },
        bounce: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-1rem)" },
        },
      },
      animation: {
        pulse: "pulse 1.5s infinite ease-in-out",
        bounce: "bounce 1.5s infinite ease-in-out",
      },
      typography: ()=>({
        'secondary-edit': {
          css: {
            '--tw-prose-body': colors.slate[700],
            '--tw-prose-headings': colors.slate[900],
            '--tw-prose-bold': colors.slate[900],
            '--tw-prose-counters': colors.slate[500],
            '--tw-prose-bullets': colors.slate[300],
            '--tw-prose-hr': colors.slate[200],
            '--tw-prose-quotes': colors.slate[900],
            '--tw-prose-quote-borders': colors.slate[200],
            '--tw-prose-captions': colors.slate[500],
            '--tw-prose-code': colors.slate[900],
            '--tw-prose-pre-code': colors.slate[200],
            '--tw-prose-pre-bg': colors.slate[800],
          },
        },
        'secondary-view': {
          css: {
            '--tw-prose-body': colors.slate[500],
            '--tw-prose-headings': colors.slate[600],
            '--tw-prose-bold': colors.slate[600],
            '--tw-prose-counters': colors.slate[300],
            '--tw-prose-bullets': colors.slate[100],
            '--tw-prose-hr': colors.slate[50],
            '--tw-prose-quotes': colors.slate[600],
            '--tw-prose-quote-borders': colors.slate[50],
            '--tw-prose-captions': colors.slate[300],
            '--tw-prose-code': colors.slate[600],
            '--tw-prose-pre-code': colors.slate[50],
            '--tw-prose-pre-bg': colors.slate[500],
          },
        }
      })
    },
  },
  plugins: [typography],
};
