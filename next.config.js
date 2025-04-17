/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Enable WebAssembly support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,  // or syncWebAssembly: true
    };

    // Set the module type for .wasm files to webassembly/async
    // (This may or may not be necessary depending on your exact setup)
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    return config;
  }
};

/** @type {import('next').NextConfig} */
module.exports = {
  async rewrites() {
    return [
      {
        source      : "/api/:path*",
        destination : `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL, // keep it exposed
  },
};


module.exports = nextConfig;
