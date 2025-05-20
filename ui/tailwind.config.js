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
        foreground: colors.slate["950"],
        'muted-foreground': colors.slate["500"]
      },
      keyframes: {
        backdropFadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' }
        },
        modalSlideIn: {
          'from': {
            opacity: '0',
            transform: 'translateY(-20px) scale(0.95)'
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          }
        },
        iconPulse: {
          '0%': {
            transform: 'scale(1)',
            opacity: '1'
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '0.7'
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1'
          }
        },
        progressLine: {
          '0%': {
            backgroundPosition: '100% 0'
          },
          '100%': {
            backgroundPosition: '-100% 0'
          }
        },
        pulse: {
          '0%': {
            transform: 'scale(0.5)',
            opacity: '0.5'
          },
          '100%': {
            transform: 'scale(1.5)',
            opacity: '0'
          }
        }
      },
      animation: {
        'backdrop-fade-in': 'backdropFadeIn 0.3s ease-out',
        'modal-slide-in': 'modalSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'icon-pulse': 'iconPulse 2s infinite',
        'progress-line': 'progressLine 2s linear infinite',
        'pulse': 'pulse 1.5s ease-out infinite'
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
