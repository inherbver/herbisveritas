// eslint.config.js
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals"; // Import globals for node environment

export default tseslint.config(
  // Règles recommandées par ESLint
  eslint.configs.recommended,
  // Règles recommandées par TypeScript-ESLint
  ...tseslint.configs.recommended,

  // Configuration spécifique pour les fichiers de config JS (comme next.config.js)
  {
    files: ["**/*.config.js", "**/*.config.cjs"], // Cible les fichiers .config.js ou .config.cjs
    languageOptions: {
      globals: {
        ...globals.node, // Active les variables globales Node.js (require, module, etc.)
      },
    },
    rules: {
      "@typescript-eslint/no-var-requires": "off", // Autorise require()
      "@typescript-eslint/no-require-imports": "off", // Alias, autorise require()
      "no-undef": "off", // Désactive la vérification pour module/require non définis (gérés par globals.node)
    },
  },

  // Configuration explicite pour no-unused-vars
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error", // Garder le niveau d'erreur
        {
          argsIgnorePattern: "^_", // Ignore les arguments commençant par _
          varsIgnorePattern: "^_", // Ignore aussi les variables locales commençant par _
          caughtErrorsIgnorePattern: "^_", // Ignore spécifiquement les erreurs catch commençant par _
        },
      ],
    },
  },

  // Configuration pour ignorer des fichiers/dossiers
  {
    ignores: [
      "node_modules/",
      ".next/",
      "out/",
      // Ajoute ici d'autres chemins à ignorer si nécessaire
      ".husky/", // Ignorer le dossier husky
      "public/", // Peut-être ignorer le dossier public ?
    ],
  }
  // Note: Les configurations pour React, Next.js, Prettier ne sont pas incluses
  // dans cette version minimale pour d'abord résoudre l'erreur principale.
  // Nous pourrons les ajouter ensuite si nécessaire.
);
