// Utilisation de CommonJS comme recommandé pour le plugin
const withNextIntl = require('next-intl/plugin')(
  // Chemin vers votre fichier de configuration i18n (depuis la racine)
  './src/i18n.ts' // Corrigé pour pointer vers src/i18n.ts
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

// Exporte la configuration enveloppée par le plugin
module.exports = withNextIntl(nextConfig);
