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
        // === Couleurs étendues pour design system ===
        "surface-base": "var(--surface-base)",
        "surface-elevated": "var(--surface-elevated)",
        "surface-sunken": "var(--surface-sunken)",
      },
      // === Ajout des box shadows avec custom properties ===
      boxShadow: {
        none: "var(--shadow-none)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        // Mode sombre
        "dark-sm": "var(--shadow-dark-sm)",
        "dark-md": "var(--shadow-dark-md)",
        "dark-lg": "var(--shadow-dark-lg)",
        "dark-xl": "var(--shadow-dark-xl)",
      },
      // === Transitions cohérentes ===
      transitionDuration: {
        fast: "var(--transition-fast)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
      // === Ring width pour focus states ===
      ringWidth: {
        DEFAULT: "var(--focus-ring-width)",
        focus: "var(--focus-ring-width)",
      },
      ringOffsetWidth: {
        DEFAULT: "var(--focus-ring-offset)",
        focus: "var(--focus-ring-offset)",
      },
      // === Z-index hiérarchisé ===
      zIndex: {
        auto: "var(--z-index-auto)",
        0: "var(--z-index-0)",
        10: "var(--z-index-10)",
        20: "var(--z-index-20)",
        30: "var(--z-index-30)",
        40: "var(--z-index-40)",
        50: "var(--z-index-50)",
        max: "var(--z-index-999)",
      },
      // === Utilités pour bordures visibles ===
      borderWidth: {
        DEFAULT: "var(--border-width-1)",
        0: "var(--border-width-0)",
        1: "var(--border-width-1)",
        2: "var(--border-width-2)",
        4: "var(--border-width-4)",
        visible: "var(--border-width-2)", // Pour bordures bien visibles
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "footer-texture":
          "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='32' height='32' fill='none' stroke-width='2' stroke='rgb(var(--foreground-rgb)/0.05)'%3e%3cpath d='M0 .5H32M.5 0V32'/%3e%3c/svg%3e\")",
        "footer-watermark":
          "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='rgb(var(--foreground-rgb)/0.03)' stroke-width='1.5'%3e%3cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z'/%3e%3cpath d='M12 5c-3.87 0-7 3.13-7 7s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 10c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z'/%3e%3c/svg%3e\")",
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
        // === Espacement de base (hauté des custom properties) ===
        0: "var(--spacing-0)",
        1: "var(--spacing-1)",
        2: "var(--spacing-2)",
        3: "var(--spacing-3)",
        4: "var(--spacing-4)",
        5: "var(--spacing-5)",
        6: "var(--spacing-6)",
        7: "1.75rem",              // Conservé pour compatibilité
        8: "var(--spacing-8)",
        9: "2.25rem",              // Conservé pour compatibilité
        10: "var(--spacing-10)",
        11: "2.75rem",             // Conservé pour compatibilité
        12: "var(--spacing-12)",
        14: "3.5rem",              // Conservé pour compatibilité
        16: "var(--spacing-16)",
        20: "var(--spacing-20)",
        24: "6rem",               // Conservé pour compatibilité
        28: "7rem",               // Conservé pour compatibilité
        32: "8rem",               // Conservé pour compatibilité
        
        // === Espacements spécifiques aux composants ===
        "card-x": "var(--card-padding-x)",
        "card-y": "var(--card-padding-y)",
        "card-gap": "var(--card-gap)",
        "card-spacing": "var(--card-spacing)",
      },
      borderRadius: {
        // === Rayons cohérents (hauté des custom properties) ===
        none: "0",
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "9999px",
        
        // === Rayons spécifiques aux composants ===
        button: "var(--button-radius)",
        card: "var(--card-radius)",
        input: "var(--input-radius)",
        dropdown: "var(--dropdown-radius)",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            "--tw-prose-body": theme("colors.foreground / 80%"),
            "--tw-prose-headings": theme("colors.primary"),
            "--tw-prose-lead": theme("colors.foreground"),
            "--tw-prose-links": theme("colors.primary"),
            "--tw-prose-bold": theme("colors.foreground"),
            "--tw-prose-counters": theme("colors.muted-foreground"),
            "--tw-prose-bullets": theme("colors.primary / 50%"),
            "--tw-prose-hr": theme("colors.border"),
            "--tw-prose-quotes": theme("colors.foreground"),
            "--tw-prose-quote-borders": theme("colors.border"),
            "--tw-prose-captions": theme("colors.muted-foreground"),
            "--tw-prose-code": theme("colors.foreground"),
            "--tw-prose-pre-code": theme("colors.foreground"),
            "--tw-prose-pre-bg": theme("colors.muted / 50%"),
            "--tw-prose-th-borders": theme("colors.border"),
            "--tw-prose-td-borders": theme("colors.border"),
            h1: {
              fontFamily: theme("fontFamily.serif"),
            },
            h2: {
              fontFamily: theme("fontFamily.serif"),
            },
            h3: {
              fontFamily: theme("fontFamily.serif"),
            },
            h4: {
              fontFamily: theme("fontFamily.serif"),
            },
            a: {
              transition: "color var(--transition-normal)",
              "&:hover": {
                color: theme("colors.primary / 80%"),
              },
            },
            // Améliorations typographiques pour l'accessibilité
            p: {
              marginBottom: "var(--spacing-4)",
              lineHeight: "1.6", // Meilleure lisibilité
            },
            "h1, h2, h3, h4, h5, h6": {
              marginTop: "var(--spacing-8)",
              marginBottom: "var(--spacing-4)",
            },
          },
        },
      }),
    },
  },
  plugins: [
    require("@tailwindcss/typography"),
    require("tailwindcss-animate"),
    require("tailwindcss-react-aria-components"),
    require("tailwindcss-interaction-media"),
  ],
};
