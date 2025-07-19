import nextIntl from "next-intl/plugin";
import createMDX from "@next/mdx";

const withNextIntl = nextIntl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js to treat MDX files as pages
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],

  // Security headers
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
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' js.stripe.com",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "img-src 'self' data: https: blob:",
              "font-src 'self' fonts.gstatic.com",
              "connect-src 'self' esgirafriwoildqcwtjm.supabase.co api.stripe.com vitals.vercel-insights.com",
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

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "esgirafriwoildqcwtjm.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    timeout: 120000, // Augmenter le timeout à 120 secondes (défaut: 60s)
    // --- Image Optimization from Refactoring Plan ---
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

const withMDX = createMDX({
  // Add MDX options here, if needed
});

export default withNextIntl(withMDX(nextConfig));
