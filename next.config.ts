import type { NextConfig } from "next";

// Debug log for environment variable loading in Next.js config
console.log('Next.js Config Debug:');
console.log('- Loading NEXT_PUBLIC_BASE_DIRECTORY:', process.env.NEXT_PUBLIC_BASE_DIRECTORY);

const nextConfig: NextConfig = {
  // No need for explicit config since we're using NEXT_PUBLIC prefix
};

export default nextConfig;
