// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { dirs: ["pages","components","lib","services","stores","views","types","scripts"], ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  output: 'export', // Add this line for static export

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
};

module.exports = nextConfig;