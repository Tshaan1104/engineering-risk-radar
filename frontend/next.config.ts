import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Set the basePath for GitHub Pages subpath deployment in production
  basePath: isProd ? '/engineering-risk-radar' : '',
};

export default nextConfig;
