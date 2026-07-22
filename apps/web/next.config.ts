import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mcp-doctor/core"],
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
};

export default nextConfig;
