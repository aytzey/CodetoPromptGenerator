// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ["pages","components","lib","services","stores","views","types","scripts"], ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  output: 'export',
  
  // Add assetPrefix to make paths relative for file:// protocol
  assetPrefix: './', 

  images: {
    unoptimized: true, // Required for 'output: export'
  }
};

module.exports = nextConfig;