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
