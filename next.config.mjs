/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export", // static site in ./out, deployed to GitHub Pages by .github/workflows/deploy.yml
  images: { unoptimized: true },
  trailingSlash: true, // emit /page/index.html so Apache serves clean URLs
};

export default nextConfig;
