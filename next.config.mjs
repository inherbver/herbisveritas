/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
};

export default nextConfig;
