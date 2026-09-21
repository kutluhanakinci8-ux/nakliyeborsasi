const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(__dirname, "../../node_modules/react"),
      "react-dom": path.join(__dirname, "../../node_modules/react-dom"),
    };
    return config;
  },
};

module.exports = nextConfig;
