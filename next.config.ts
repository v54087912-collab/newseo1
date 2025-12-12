import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',             // <--- Step 1: Ye line add karein
  images: {
    unoptimized: true,          // <--- Step 2: Ye line add karein (Netlify ke liye zaroori)
  },
  // Dev rewrites ko production mein ignore karein
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/:path*',
      },
    ];
  },
};

export default nextConfig;