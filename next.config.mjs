/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ["recharts"],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
};
export default nextConfig;
