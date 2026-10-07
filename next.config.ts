import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Allow image uploads up to 5 MB through Server Actions (default is 1 MB)
    serverActions: { bodySizeLimit: '4.5mb' },
  },
};

export default nextConfig;
