import type { NextConfig } from "next";

// Content Security Policy - start with permissive policy, tighten as needed
// Uses 'unsafe-inline' for styles (required by Tailwind/Next.js) and scripts (Next.js hydration)
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob: https://images.unsplash.com;
  font-src 'self';
  connect-src 'self' https://api.iconify.design;
  frame-ancestors 'self';
  form-action 'self';
  base-uri 'self';
  object-src 'none';
`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
