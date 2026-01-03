/** @type {import('next').NextConfig} */
const nextConfig = {
  // TypeScript: Enable strict checking once types are fixed
  // TODO: Set to false after fixing all type errors
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint: Enable checks once linting errors are fixed
  // TODO: Set to false after fixing all lint errors
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Restrict remote image domains for security
  images: {
    remotePatterns: [
      // Supabase storage
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      // AWS S3 (your bucket)
      {
        protocol: 'https',
        hostname: 's3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      // CloudFront CDN
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      // Disney/Universal official images
      {
        protocol: 'https',
        hostname: 'cdn-ssl.s7.disneystore.com',
      },
      {
        protocol: 'https',
        hostname: 'lumiere-a.akamaihd.net',
      },
      {
        protocol: 'https',
        hostname: '*.wdpromedia.com',
      },
      // Blog sources for release images
      {
        protocol: 'https',
        hostname: 'wdwnt.com',
      },
      {
        protocol: 'https',
        hostname: '*.wdwnt.com',
      },
      {
        protocol: 'https',
        hostname: 'blogmickey.com',
      },
      {
        protocol: 'https',
        hostname: '*.blogmickey.com',
      },
      {
        protocol: 'https',
        hostname: 'laughingplace.com',
      },
      {
        protocol: 'https',
        hostname: '*.laughingplace.com',
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
