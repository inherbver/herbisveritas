// Configuration Next.js fusionnée - Combinant sécurité + performance
import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";
import ImageMinimizerPlugin from "image-minimizer-webpack-plugin";

const withNextIntl = createNextIntlPlugin(
  // Chemin spécifique vers notre fichier i18n
  "./src/i18n.ts"
);

const withMDX = createMDX({
  // Configuration MDX pour pages légales
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Support MDX pour les pages légales (de .mjs)
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  // Optimisation production (de .js)
  productionBrowserSourceMaps: false,

  experimental: {
    // Possibilité d'activer typedRoutes si nécessaire
    // typedRoutes: true,
  },

  // ========================================
  // SÉCURITÉ (du .mjs) - CRITIQUE
  // ========================================
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' js.stripe.com ws.colissimo.fr",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' fonts.gstatic.com",
              // Ajout des domaines nécessaires pour Next.js + nos services
              "connect-src 'self' localhost:* 127.0.0.1:* esgirafriwoildqcwtjm.supabase.co api.stripe.com vitals.vercel-insights.com ws.colissimo.fr",
              "frame-src js.stripe.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // ========================================
  // WEBPACK OPTIMISATIONS (du .js) - PERFORMANCE
  // ========================================
  webpack: (config, { dev, isServer }) => {
    // Configuration développement pour source maps (Firefox/Turbopack)
    if (dev) {
      config.output.devtoolNamespace = "herbisveritas-app";
      config.output.devtoolModuleFilenameTemplate = (info) =>
        `webpack://${config.output.devtoolNamespace}/${info.absoluteResourcePath.replace(/\\/g, "/")}`;
    }

    // Ignorer certains warnings en développement
    if (dev && !isServer) {
      config.ignoreWarnings = [{ message: /unreachable code after return statement/ }];
    }

    // Optimisation des images en production
    if (!dev && !isServer) {
      config.optimization.minimizer.push(
        new ImageMinimizerPlugin({
          minimizer: {
            implementation: ImageMinimizerPlugin.imageminMinify,
            options: {
              plugins: [
                ["mozjpeg", { quality: 75, progressive: true }], // JPEG
                ["pngquant", { quality: [0.65, 0.9], speed: 4 }], // PNG
                [
                  "imagemin-webp", // WebP
                  {
                    quality: 75,
                  },
                ],
              ],
            },
          },
        })
      );
    }

    return config;
  },

  // ========================================
  // CONFIGURATION IMAGES - FUSIONNÉE
  // ========================================
  images: {
    // Patterns combinés : spécifiques du .js + flexibilité du .mjs
    remotePatterns: [
      // Patterns spécifiques pour plus de sécurité
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
      // Fallback général pour autres contenus si nécessaire
      {
        protocol: "https",
        hostname: "esgirafriwoildqcwtjm.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],

    // Optimisations avancées (timeout n'est pas supporté dans Next.js 15)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

// Export avec les plugins dans le bon ordre
export default withNextIntl(withMDX(nextConfig));
