'use client'

import { useState } from 'react'
import { BarChart3, TrendingUp, Users, FileText } from 'lucide-react'

interface ChainData {
  name: string
  proposals: number
  passRate: number
  validators: number
  color: string
}

export default function ChainComparison() {
  const [selectedMetric, setSelectedMetric] = useState<'proposals' | 'passRate' | 'validators'>('proposals')

  const chainData: ChainData[] = [
    { name: 'Osmosis', proposals: 809, passRate: 85.2, validators: 317, color: 'bg-purple-500' },
    { name: 'Injective', proposals: 454, passRate: 82.1, validators: 156, color: 'bg-blue-500' },
    { name: 'Stargaze', proposals: 282, passRate: 79.8, validators: 198, color: 'bg-pink-500' },
    { name: 'Cosmos Hub', proposals: 264, passRate: 81.4, validators: 398, color: 'bg-indigo-500' },
    { name: 'Secret', proposals: 248, passRate: 77.9, validators: 142, color: 'bg-gray-500' },
    { name: 'Evmos', proposals: 232, passRate: 76.3, validators: 333, color: 'bg-green-500' },
    { name: 'Kava', proposals: 209, passRate: 83.7, validators: 89, color: 'bg-orange-500' },
    { name: 'Gravity Bridge', proposals: 208, passRate: 88.9, validators: 226, color: 'bg-cyan-500' },
  ]

  const getMetricValue = (chain: ChainData) => {
    switch (selectedMetric) {
      case 'proposals': return chain.proposals
      case 'passRate': return chain.passRate
      case 'validators': return chain.validators
      default: return chain.proposals
    }
  }

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'proposals': return '프로포절 수'
      case 'passRate': return '통과율 (%)'
      case 'validators': return '검증인 수'
      default: return '프로포절 수'
    }
  }

  const maxValue = Math.max(...chainData.map(getMetricValue))

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">체인별 비교 분석</h2>
        <p className="text-gray-600">
          코스모스 생태계 주요 체인들의 거버넌스 활동을 비교해보세요
        </p>
      </div>

      {/* 메트릭 선택 버튼 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMetric('proposals')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'proposals'
              ? 'bg-blue-100 text-blue-700 border border-blue-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FileText className="w-4 h-4 mr-2" />
          프로포절 수
        </button>
        <button
          onClick={() => setSelectedMetric('passRate')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'passRate'
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          통과율
        </button>
        <button
          onClick={() => setSelectedMetric('validators')}
          className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedMetric === 'validators'
              ? 'bg-purple-100 text-purple-700 border border-purple-300'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="w-4 h-4 mr-2" />
          검증인 수
        </button>
      </div>

      {/* 차트 영역 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {getMetricLabel()} 비교
        </h3>
        
        {chainData.map((chain, index) => {
          const value = getMetricValue(chain)
          const percentage = (value / maxValue) * 100
          
          return (
            <div key={chain.name} className="flex items-center space-x-4">
              <div className="w-24 text-sm font-medium text-gray-700 text-right">
                {chain.name}
              </div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div
                  className={`h-full ${chain.color} transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white mix-blend-difference">
                    {selectedMetric === 'passRate' ? `${value.toFixed(1)}%` : value.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 상세 통계 테이블 */}
      <div className="mt-8 overflow-x-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">상세 통계</h3>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                체인
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                프로포절 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                통과율
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                검증인 수
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                활성도
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {chainData.map((chain, index) => (
              <tr key={chain.name} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${chain.color} mr-3`} />
                    <div className="text-sm font-medium text-gray-900">{chain.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {chain.proposals.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {chain.passRate.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {chain.validators.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    chain.proposals > 300 
                      ? 'bg-green-100 text-green-800' 
                      : chain.proposals > 200 
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {chain.proposals > 300 ? '높음' : chain.proposals > 200 ? '보통' : '낮음'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
} 