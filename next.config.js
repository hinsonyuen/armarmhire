/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse's internal pdfjs-dist dependency breaks when webpack tries
  // to bundle its ESM build for server routes (its own module-registration
  // code ends up calling Object.defineProperty on something undefined).
  // Marking these as external server packages makes Next.js load them
  // natively via Node's require/import at runtime instead of bundling
  // them, which avoids the issue entirely.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "pdfjs-dist"],
  },
};

module.exports = nextConfig;
