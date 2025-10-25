/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, 
  experimental: {
    optimizePackageImports: ["tailwindcss"],
  },
};

export default nextConfig;