import nextIntl from 'next-intl/plugin';
import createMDX from '@next/mdx';

const withNextIntl = nextIntl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Tell Next.js to treat MDX files as pages
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'esgirafriwoildqcwtjm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
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
