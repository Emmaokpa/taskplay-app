// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Add your Supabase hostname here
    domains: ['nxlyfsienjtxyurzkgcf.supabase.co'],
  },

  // Add the webpack configuration to handle the 'ws' module
  webpack: (config, { isServer }) => {
    // Only modify webpack config for the client build
    // 'ws' is a Node.js module and should not be bundled for the browser
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        ws: 'commonjs ws', // Exclude 'ws' from client bundle
      });
    }

    return config;
  },
};

export default nextConfig;