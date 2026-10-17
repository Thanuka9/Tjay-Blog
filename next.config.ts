import type { NextConfig } from "next";

const pdfAssets = [
  "./public/fonts/pdf/*.ttf",
  "./public/articles/**/*",
  "./public/covers/**/*",
  "./public/uploads/**/*",
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/download/**": pdfAssets,
    "/**/download": pdfAssets,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
