/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vinted item images are served from various CDN hosts. We allow remote images
  // but note: images are shown via <img> with referrerPolicy to avoid hotlink blocks.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.vinted.net" },
      { protocol: "https", hostname: "**.vinted.com" },
      { protocol: "https", hostname: "images1.vinted.net" },
    ],
  },
  experimental: {
    // Prisma needs to be treated as external in server components / route handlers.
    serverComponentsExternalPackages: ["@prisma/client", "pino", "web-push"],
  },
};

export default nextConfig;
