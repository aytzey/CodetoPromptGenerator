/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ["pages","components","lib","services","stores","views","types","scripts"], ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  // ⬇️  ADD: tell chokidar not to watch gigantic / irrelevant dirs
  webpackDevMiddleware: (config) => {
    config.watchOptions.ignored = [
      "**/python_backend/venv/**",
      "**/.codetoprompt/**",
      "**/sample_project/meta_prompts/**",
      "**/node_modules/**",
      "**/externalLibs/**"
    ];
    return config;
  },

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*` }];
  },
  env: { NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL },
};

module.exports = nextConfig;
