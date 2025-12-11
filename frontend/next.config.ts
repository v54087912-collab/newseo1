import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization is supported on Netlify via the plugin, 
  // but unoptimized can be safer if using standard Netlify hosting without the plugin fully configured.
  // We'll keep it standard for now as the plugin handles it.
  
  // Rewrites are handled in netlify.toml for production, 
  // but keeping them here is good for 'next dev' local testing.
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
