'use client'

import { useState, useMemo } from 'react'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Users, 
  BarChart3, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Zap,
  Brain,
  Eye,
  ArrowRight
} from 'lucide-react'
import { useGlobalStore } from '@/stores/useGlobalStore'

interface PredictionResult {
  passLikelihood: number
  confidence: number
  keyFactors: {
    name: string
    impact: number
    trend: 'positive' | 'negative' | 'neutral'
    description: string
  }[]
  similarProposals: {
    title: string
    similarity: number
    passed: boolean
    date: string
  }[]
  criticalValidators: {
    name: string
    votingPower: number
    predictedVote: 'YES' | 'NO' | 'ABSTAIN' | 'UNCERTAIN'
    confidence: number
  }[]
}

export default function PredictionPanel() {
  const { 
    selectedChain, 
    selectedCategories, 
    selectedTopics, 
    proposalData,
    rawProposals,
    windowSize
  } = useGlobalStore()

  const [selectedPredictionType, setSelectedPredictionType] = useState<'next' | 'hypothetical'>('next')

  // 모의 예측 데이터 (실제 로직 구현 전 레이아웃 테스트용)
  const mockPrediction: PredictionResult = useMemo(() => ({
    passLikelihood: 73.2,
    confidence: 85.4,
    keyFactors: [
      {
        name: 'Historical Pass Rate',
        impact: 0.25,
        trend: 'positive',
        description: `${selectedChain !== 'all' ? selectedChain : 'Selected chains'} has 78.9% pass rate for similar proposals`
      },
      {
        name: 'Category Alignment',
        impact: 0.22,
        trend: selectedCategories.length > 0 ? 'positive' : 'neutral',
        description: selectedCategories.length > 0 
          ? `Selected categories show strong community support`
          : 'No specific category filter applied'
      },
      {
        name: 'Validator Sentiment',
        impact: 0.20,
        trend: 'positive',
        description: 'Top validators show positive voting patterns for this type'
      },
      {
        name: 'Market Conditions',
        impact: 0.18,
        trend: 'neutral',
        description: 'Current market sentiment is stable'
      },
      {
        name: 'Community Activity',
        impact: 0.15,
        trend: 'positive',
        description: 'High governance participation in recent proposals'
      }
    ],
    similarProposals: [
      { title: 'Parameter Update: Inflation Rate', similarity: 0.89, passed: true, date: '2024-11-15' },
      { title: 'Community Pool Spend: Development', similarity: 0.76, passed: true, date: '2024-10-28' },
      { title: 'Validator Commission Change', similarity: 0.71, passed: false, date: '2024-10-12' },
      { title: 'Network Upgrade Proposal', similarity: 0.68, passed: true, date: '2024-09-30' }
    ],
    criticalValidators: [
      { name: 'Cosmos Validator A', votingPower: 8.5, predictedVote: 'YES', confidence: 0.82 },
      { name: 'Staking Provider B', votingPower: 6.2, predictedVote: 'YES', confidence: 0.75 },
      { name: 'Validator Network C', votingPower: 5.8, predictedVote: 'UNCERTAIN', confidence: 0.45 },
      { name: 'Community Validator D', votingPower: 4.9, predictedVote: 'YES', confidence: 0.68 },
      { name: 'Enterprise Validator E', votingPower: 4.1, predictedVote: 'NO', confidence: 0.71 }
    ]
  }), [selectedChain, selectedCategories])

  const isMobileScreen = windowSize.width < 640
  const isCompactView = windowSize.width < 1400

  const getVotePredictionColor = (vote: string) => {
    switch (vote) {
      case 'YES': return 'text-green-600 bg-green-50'
      case 'NO': return 'text-red-600 bg-red-50'
      case 'ABSTAIN': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'positive': return <TrendingUp className="w-3 h-3 text-green-600" />
      case 'negative': return <TrendingDown className="w-3 h-3 text-red-600" />
      default: return <Target className="w-3 h-3 text-gray-600" />
    }
  }

  if (isMobileScreen) {
    return null // 모바일에서는 예측 패널 숨김
  }

  return (
    <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">Prediction Engine</h3>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
            Beta
          </span>
        </div>
        
        {/* 예측 타입 선택 */}
        <div className="flex gap-1 bg-white rounded-lg p-1">
          <button
            onClick={() => setSelectedPredictionType('next')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              selectedPredictionType === 'next'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Next Proposal
          </button>
          <button
            onClick={() => setSelectedPredictionType('hypothetical')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
              selectedPredictionType === 'hypothetical'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Hypothetical
          </button>
        </div>
      </div>

      {/* 메인 예측 결과 */}
      <div className="p-4 border-b border-gray-100">
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {mockPrediction.passLikelihood > 60 ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-orange-600" />
            )}
            <span className="text-sm font-medium text-gray-600">Pass Likelihood</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {mockPrediction.passLikelihood.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">
            Confidence: {mockPrediction.confidence.toFixed(1)}%
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              mockPrediction.passLikelihood > 60 ? 'bg-green-500' : 'bg-orange-500'
            }`}
            style={{ width: `${mockPrediction.passLikelihood}%` }}
          />
        </div>

        {/* 빠른 통계 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Based on</div>
            <div className="font-semibold">{mockPrediction.similarProposals.length} similar</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Key validators</div>
            <div className="font-semibold">{mockPrediction.criticalValidators.length} tracked</div>
          </div>
        </div>
      </div>

      {/* 스크롤 가능한 상세 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 주요 요인들 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-gray-900 text-sm">Key Factors</h4>
          </div>
          <div className="space-y-2">
            {mockPrediction.keyFactors.map((factor, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(factor.trend)}
                    <span className="text-xs font-medium text-gray-800">
                      {factor.name}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-gray-600">
                    {(factor.impact * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1 mb-2">
                  <div 
                    className="h-1 rounded-full bg-blue-500"
                    style={{ width: `${factor.impact * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 유사 제안들 */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-green-600" />
            <h4 className="font-medium text-gray-900 text-sm">Similar Proposals</h4>
          </div>
          <div className="space-y-2">
            {mockPrediction.similarProposals.map((proposal, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <div className={`w-2 h-2 rounded-full ${
                  proposal.passed ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">
                    {proposal.title}
                  </div>
                  <div className="text-xs text-gray-500">
                    {(proposal.similarity * 100).toFixed(0)}% similar • {proposal.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 핵심 검증인들 */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-orange-600" />
            <h4 className="font-medium text-gray-900 text-sm">Critical Validators</h4>
          </div>
          <div className="space-y-2">
            {mockPrediction.criticalValidators.map((validator, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-800 truncate">
                    {validator.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {validator.votingPower.toFixed(1)}% voting power
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    getVotePredictionColor(validator.predictedVote)
                  }`}>
                    {validator.predictedVote}
                  </span>
                  <div className="text-xs text-gray-500">
                    {(validator.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 mb-2">
            <Zap className="w-4 h-4" />
            Run Full Analysis
          </button>
          <button className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>
    </div>
  )
} 