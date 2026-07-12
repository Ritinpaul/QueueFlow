/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@scheduler/types"],
  experimental: {
    serverComponentsExternalPackages: [],
  },
};

export default nextConfig;
