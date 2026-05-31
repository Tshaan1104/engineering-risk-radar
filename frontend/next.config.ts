import type { NextConfig } from "next";

// Check if we are deploying to GitHub Pages (production build, but NOT on Vercel)
const isGitHubPages = process.env.NODE_ENV === 'production' && !process.env.VERCEL;

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Set the basePath only for GitHub Pages subpath deployment, leaving Vercel at root
  basePath: isGitHubPages ? '/engineering-risk-radar' : '',
};

export default nextConfig;
