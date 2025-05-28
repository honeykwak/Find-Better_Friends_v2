'use client'

import { X, FileText, Users, Vote, TrendingUp, Calendar, CheckCircle } from 'lucide-react'

interface InfoModalProps {
  onClose: () => void
}

export default function InfoModal({ onClose }: InfoModalProps) {
  const stats = [
    {
      title: 'Total Proposals',
      value: '3,594',
      icon: FileText,
      color: 'bg-blue-500',
      description: '5 years 8 months'
    },
    {
      title: 'Validators',
      value: '3,421',
      icon: Users,
      color: 'bg-green-500',
      description: '17 chains'
    },
    {
      title: 'Total Votes',
      value: '412,744',
      icon: Vote,
      color: 'bg-purple-500',
      description: 'All voting records'
    },
    {
      title: 'Pass Rate',
      value: '78.9%',
      icon: CheckCircle,
      color: 'bg-emerald-500',
      description: 'Proposal success rate'
    },
    {
      title: 'Active Chains',
      value: '17',
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Cosmos ecosystem'
    },
    {
      title: 'Data Period',
      value: '2019-2024',
      icon: Calendar,
      color: 'bg-indigo-500',
      description: '5 years 8 months'
    }
  ]

  const topChains = [
    { name: 'Osmosis', proposals: 809 },
    { name: 'Injective', proposals: 454 },
    { name: 'Stargaze', proposals: 282 },
    { name: 'Cosmos Hub', proposals: 264 },
    { name: 'Secret Network', proposals: 248 }
  ]

  const voteDistribution = [
    { type: 'YES Vote', percentage: 40.5 },
    { type: 'NO_VOTE', percentage: 42.3 },
    { type: 'NO_WITH_VETO', percentage: 6.1 },
    { type: 'ABSTAIN', percentage: 6.1 },
    { type: 'NO', percentage: 4.8 }
  ]

  const categoryPassRates = [
    { name: 'ChainSpecific', rate: 100.0 },
    { name: 'PoolData', rate: 100.0 },
    { name: 'TokenRelated', rate: 97.8 },
    { name: 'PoolIncentives', rate: 96.2 },
    { name: 'ParameterChange', rate: 92.9 }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 배경 오버레이 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* 모달 콘텐츠 */}
        <div className="inline-block w-full max-w-6xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Project Information</h2>
              <p className="text-gray-600 mt-1">
                Cosmos Ecosystem Governance Voting Data Analysis
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* 전체 통계 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 rounded-md ${stat.color} p-2`}>
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                      <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-400">{stat.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 상세 분석 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 체인별 활동도 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Most Active Chains (Top 5)
              </h3>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                <div className="space-y-3">
                  {topChains.map((chain, index) => (
                    <div key={chain.name} className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span className="text-blue-700 font-medium">{chain.name}</span>
                      </div>
                      <span className="font-bold text-blue-900">{chain.proposals}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 투표 참여 현황 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Vote Option Distribution
              </h3>
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="space-y-3">
                  {voteDistribution.map((vote, index) => (
                    <div key={vote.type} className="flex justify-between items-center">
                      <span className="text-green-700">{vote.type}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-green-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(vote.percentage / 50) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium text-green-900 w-12 text-right">
                          {vote.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 카테고리별 통과율 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Category Pass Rates (Top 5)
              </h3>
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
                <div className="space-y-3">
                  {categoryPassRates.map((category, index) => (
                    <div key={category.name} className="flex justify-between items-center">
                      <span className="text-purple-700">{category.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-purple-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full"
                            style={{ width: `${category.rate}%` }}
                          />
                        </div>
                        <span className="font-medium text-purple-900 w-12 text-right">
                          {category.rate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 연구 목적 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Research Purpose & Methodology
              </h3>
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg p-4 border border-gray-200">
                <div className="space-y-3 text-sm text-gray-700">
                  <div>
                    <h4 className="font-medium text-gray-900">1. Proposal Analysis</h4>
                    <p>Analyze pass rates by category and chain to predict natural proposal success probability</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">2. Validator Analysis</h4>
                    <p>Calculate persuasion priorities based on voting pattern similarity for efficient lobbying strategies</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">3. Visualization Research</h4>
                    <p>Implement interactive visualization enabling analysis to decision-making in a single screen</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 기술 스택 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tech Stack</h3>
            <div className="flex flex-wrap gap-2">
              {['Next.js 15', 'React 18', 'TypeScript', 'Tailwind CSS', 'Plotly.js', 'Python', 'Pandas', 'BERT'].map(tech => (
                <span 
                  key={tech}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 