// Utilisation de CommonJS comme recommandé pour le plugin
const withNextIntl = require("next-intl/plugin")(
  // Chemin vers votre fichier de configuration i18n (depuis la racine)
  "./src/i18n.ts" // Corrigé pour pointer vers src/i18n.ts
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  webpack(config, { dev, isServer }) {
    if (dev && !isServer) {
      config.ignoreWarnings = [
        { message: /unreachable code after return statement/ },
        { message: /Invalid URL: file:\/\// },
      ];
    }
    return config;
  },
};

// Exporte la configuration enveloppée par le plugin
module.exports = withNextIntl(nextConfig);
