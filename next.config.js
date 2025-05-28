/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  eslint: {
    // 빌드 시 ESLint 오류 무시 (배포용)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 빌드 시 TypeScript 오류 무시 (배포용)
    ignoreBuildErrors: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  webpack: (config) => {
    // Plotly.js 최적화 - react-plotly.js 호환성 개선
    config.resolve.alias = {
      ...config.resolve.alias,
      'plotly.js/dist/plotly': 'plotly.js-dist-min',
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