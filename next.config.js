// Utilisation de ES Module comme recommandé pour le plugin
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(
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
      ];
    }
    return config;
  },
};

// Exporte la configuration enveloppée par le plugin
export default withNextIntl(nextConfig);
