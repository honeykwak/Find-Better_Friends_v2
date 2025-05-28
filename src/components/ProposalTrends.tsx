'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Plotly를 동적으로 로드 (SSR 방지)
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false })

interface TrendData {
  years: number[]
  proposalCounts: number[]
  passRates: number[]
}

export default function ProposalTrends() {
  const [trendData, setTrendData] = useState<TrendData>({
    years: [2019, 2020, 2021, 2022, 2023, 2024],
    proposalCounts: [15, 63, 324, 930, 1285, 977],
    passRates: [86.7, 81.0, 79.3, 78.2, 78.8, 79.1]
  })

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 실제 구현에서는 여기서 데이터를 로드
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">프로포절 트렌드 분석</h2>
        <p className="text-gray-600">
          연도별 프로포절 수와 통과율 변화를 확인하세요
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 연도별 프로포절 수 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">연도별 프로포절 수</h3>
          <Plot
            data={[
              {
                x: trendData.years,
                y: trendData.proposalCounts,
                type: 'bar',
                marker: {
                  color: 'rgba(59, 130, 246, 0.8)',
                  line: {
                    color: 'rgba(59, 130, 246, 1)',
                    width: 1
                  }
                },
                text: trendData.proposalCounts.map(count => count.toString()),
                textposition: 'auto',
              }
            ]}
            layout={{
              title: '',
              xaxis: { title: '연도' },
              yaxis: { title: '프로포절 수' },
              margin: { l: 50, r: 20, t: 20, b: 50 },
              plot_bgcolor: 'rgba(0,0,0,0)',
              paper_bgcolor: 'rgba(0,0,0,0)',
              font: { family: 'Inter, sans-serif' }
            }}
            config={{ displayModeBar: false }}
            style={{ width: '100%', height: '300px' }}
          />
        </div>

        {/* 연도별 통과율 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">연도별 통과율</h3>
          <Plot
            data={[
              {
                x: trendData.years,
                y: trendData.passRates,
                type: 'scatter',
                mode: 'lines+markers',
                line: {
                  color: 'rgba(16, 185, 129, 1)',
                  width: 3
                },
                marker: {
                  color: 'rgba(16, 185, 129, 1)',
                  size: 8
                }
              }
            ]}
            layout={{
              title: '',
              xaxis: { title: '연도' },
              yaxis: { 
                title: '통과율 (%)',
                range: [70, 90]
              },
              margin: { l: 50, r: 20, t: 20, b: 50 },
              plot_bgcolor: 'rgba(0,0,0,0)',
              paper_bgcolor: 'rgba(0,0,0,0)',
              font: { family: 'Inter, sans-serif' }
            }}
            config={{ displayModeBar: false }}
            style={{ width: '100%', height: '300px' }}
          />
        </div>
      </div>

      {/* 인사이트 */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">급성장 시기</h4>
          <p className="text-sm text-blue-700">
            2021-2023년 사이 프로포절 수가 급격히 증가하여 생태계 활성화를 보여줍니다.
          </p>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2">안정적 통과율</h4>
          <p className="text-sm text-green-700">
            통과율이 78-87% 범위에서 안정적으로 유지되고 있습니다.
          </p>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <h4 className="font-semibold text-purple-900 mb-2">최근 동향</h4>
          <p className="text-sm text-purple-700">
            2024년 프로포절 수는 다소 감소했지만 여전히 높은 수준을 유지합니다.
          </p>
        </div>
      </div>
    </div>
  )
} 