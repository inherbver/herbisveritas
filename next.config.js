// Utilisation de ES Module comme recommandé pour le plugin
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin(
  // Chemin vers votre fichier de configuration i18n (depuis la racine)
  "./src/i18n.ts" // Corrigé pour pointer vers src/i18n.ts
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    // typedRoutes: true, // Enable typed routes for better type safety
  },
  webpack: (config, { dev, isServer }) => {
    // Solution 3.1: Attempt to fix source map URLs for Turbopack/Firefox
    // https://nextjs.org/docs/api-reference/next.config.js/custom-webpack-config
    // While these are Webpack settings, Turbopack might pick them up or have similar behavior.
    if (dev) {
      config.output.devtoolNamespace = "herbisveritas-app"; // Using a project-specific namespace
      config.output.devtoolModuleFilenameTemplate = (info) =>
        `webpack://${config.output.devtoolNamespace}/${info.absoluteResourcePath.replace(/\\/g, "/")}`;
    }

    if (dev && !isServer) {
      config.ignoreWarnings = [{ message: /unreachable code after return statement/ }];
    }
    return config;
  },
  images: {
    // Existing image config...
  },
};

// Exporte la configuration enveloppée par le plugin
export default withNextIntl(nextConfig);
