import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent 307 redirects for trailing slash - important for webhooks (Telegram)
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
};

export default nextConfig;
