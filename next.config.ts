import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'puppeteer-core', 
    '@sparticuz/chromium'
  ],
  webpack(config, { isServer }) {
    if (isServer) {
      config.externals.push("chrome-aws-lambda", "puppeteer-core");
    }
    config.module.rules.push({
      test: /\.js\.map$/,
      loader: "ignore-loader",
      include: /node_modules\/chrome-aws-lambda/,
    });

    return config;
  },
};

export default nextConfig;
