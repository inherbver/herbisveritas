/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // temporary broad inclusion
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  safelist: ["font-sans", "text-lg", "font-medium", "text-sm"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        border: "var(--border)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        support: {
          DEFAULT: "var(--support)",
          foreground: "var(--support-foreground)",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        'footer-texture': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='2' stroke='rgb(var(--foreground-rgb)/0.05)'%3e%3cpath d='M0 .5H32M.5 0V32'/%3e%3c/svg%3e\")",
        'footer-watermark': "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgb(var(--foreground-rgb)/0.03)' stroke-width='1.5'%3e%3cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'/%3e%3cpath d='M12 5c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z'/%3e%3c/svg%3e\")",
      },
      fontFamily: {
        sans: ["var(--font-raleway)", "sans-serif"],
        serif: ["var(--font-playfair)", "serif"],
      },
      fontSize: {
        // --- Typographic Scale from Refactoring Plan ---
        // Body text (150% line height)
        xs: ["0.75rem", { lineHeight: "1.5" }],
        sm: ["0.875rem", { lineHeight: "1.5" }],
        base: ["1rem", { lineHeight: "1.5" }],
        lg: ["1.125rem", { lineHeight: "1.5" }],
        xl: ["1.25rem", { lineHeight: "1.5" }],
        "2xl": ["1.5rem", { lineHeight: "1.5" }],

        // Headings (130% line height, -1% tracking for serif)
        h3: ["1.92rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        h2: ["2.4rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        h1: ["3rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
      },
      spacing: {
        0: "0",
        1: "0.25rem",
        2: "0.5rem",
        3: "0.75rem",
        4: "1rem",
        5: "1.25rem",
        6: "1.5rem",
        7: "1.75rem",
        8: "2rem",
        9: "2.25rem",
        10: "2.5rem",
        11: "2.75rem",
        12: "3rem",
        14: "3.5rem",
        16: "4rem",
        20: "5rem",
        24: "6rem",
        28: "7rem",
        32: "8rem",
      },
      borderRadius: {
        none: "0",
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.5rem",
        full: "9999px",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': theme('colors.foreground / 80%'),
            '--tw-prose-headings': theme('colors.primary'),
            '--tw-prose-lead': theme('colors.foreground'),
            '--tw-prose-links': theme('colors.primary'),
            '--tw-prose-bold': theme('colors.foreground'),
            '--tw-prose-counters': theme('colors.muted-foreground'),
            '--tw-prose-bullets': theme('colors.primary / 50%'),
            '--tw-prose-hr': theme('colors.border'),
            '--tw-prose-quotes': theme('colors.foreground'),
            '--tw-prose-quote-borders': theme('colors.border'),
            '--tw-prose-captions': theme('colors.muted-foreground'),
            '--tw-prose-code': theme('colors.foreground'),
            '--tw-prose-pre-code': theme('colors.foreground'),
            '--tw-prose-pre-bg': theme('colors.muted / 50%'),
            '--tw-prose-th-borders': theme('colors.border'),
            '--tw-prose-td-borders': theme('colors.border'),
            h1: {
              fontFamily: theme('fontFamily.serif'),
            },
            h2: {
              fontFamily: theme('fontFamily.serif'),
            },
            h3: {
              fontFamily: theme('fontFamily.serif'),
            },
            h4: {
              fontFamily: theme('fontFamily.serif'),
            },
            a: {
              transition: 'color 0.2s ease-in-out',
              '&:hover': {
                color: theme('colors.primary / 80%'),
              },
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate"), require("tailwindcss-react-aria-components"), require("tailwindcss-interaction-media")],
};
