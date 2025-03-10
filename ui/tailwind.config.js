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
          ...colors.indigo,
        },
        secondary: {
          ...colors.slate,
        },
        success: {
          ...colors.emerald,
        },
        danger: {
          ...colors.red,
        },
        warning: {
          ...colors.amber,
        },
      },
    },
  },
  plugins: [typography],
};
