/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React runtime checks during development
  reactStrictMode: true,

  /** 🧹 ESLint — run “npm run lint” or “yarn lint”
   *   Lints the listed folders on build and via the dedicated script.
   *   (Next ≥12 automatically fails the build if lint errors are detected.)
   */
  eslint: {
    dirs: [
      'pages',
      'components',
      'lib',
      'services',
      'stores',
      'views',
      'types',
      'scripts',
    ],
  },

  /** ↔ API reverse‑proxy */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },

  /** 🔐 Expose variables at build‑time only */
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

module.exports = nextConfig;
