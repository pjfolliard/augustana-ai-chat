/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp']
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },
  // Enable compression
  compress: true,
  // Optimize builds
  swcMinify: true,
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig