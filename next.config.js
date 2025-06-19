// Utilisation de ES Module comme recommandé pour le plugin
import createNextIntlPlugin from "next-intl/plugin";
import ImageMinimizerPlugin from "image-minimizer-webpack-plugin"; // Importation du plugin

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

    // Configuration de l'optimisation des images en production
    if (!dev && !isServer) {
      // Appliquer uniquement en production et côté client
      config.optimization.minimizer.push(
        new ImageMinimizerPlugin({
          minimizer: {
            implementation: ImageMinimizerPlugin.imageminMinify,
            options: {
              plugins: [
                ["mozjpeg", { quality: 75, progressive: true }], // Optimisation JPEG
                ["pngquant", { quality: [0.65, 0.9], speed: 4 }], // Optimisation PNG
                [
                  "imagemin-webp", // Optimisation WebP
                  {
                    quality: 75,
                  },
                ],
              ],
            },
          },
          // Vous pouvez ajouter des règles pour cibler des types d'images spécifiques
          // Par exemple, pour optimiser les images importées directement dans vos composants :
          // generator: [
          //   {
          //     preset: "webp",
          //     implementation: ImageMinimizerPlugin.imageminGenerate,
          //     options: {
          //       plugins: ["imagemin-webp"],
          //     },
          //   },
          // ],
        })
      );
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "esgirafriwoildqcwtjm.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/products/**",
      },
      {
        protocol: "https",
        hostname: "esgirafriwoildqcwtjm.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/about/**",
      },
      {
        protocol: "https",
        hostname: "esgirafriwoildqcwtjm.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/contact/**",
      },
    ],
  },
};

// Exporte la configuration enveloppée par le plugin
export default withNextIntl(nextConfig);
