/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  webpack: (config) => {
    // Plotly.js 최적화
    config.resolve.alias = {
      ...config.resolve.alias,
      'plotly.js': 'plotly.js-dist-min'
    }
    return config
  },
  // 정적 파일 최적화
  async headers() {
    return [
      {
        source: '/processed_data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800'
          }
        ]
      },
      {
        source: '/optimized_data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800'
          },
          {
            key: 'X-Data-Optimized',
            value: 'true'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 