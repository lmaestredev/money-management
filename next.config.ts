import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions default a 1MB body; las fotos de tickets necesitan más.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
