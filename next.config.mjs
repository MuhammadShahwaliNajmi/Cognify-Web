/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export", // produces a static site in ./out for upload to Hostinger
  images: { unoptimized: true },
  trailingSlash: true, // emit /page/index.html so Apache serves clean URLs
};

export default nextConfig;
