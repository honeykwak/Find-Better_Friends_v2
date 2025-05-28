'use client'

import { useEffect, useState } from 'react'
import { FileText, Users, Vote, TrendingUp, Calendar, CheckCircle } from 'lucide-react'

interface StatsData {
  totalProposals: number
  totalValidators: number
  totalVotes: number
  passRate: number
  activeChains: number
  timeSpan: string
}

export default function OverviewStats() {
  const [stats, setStats] = useState<StatsData>({
    totalProposals: 3594,
    totalValidators: 3421,
    totalVotes: 412744,
    passRate: 78.9,
    activeChains: 17,
    timeSpan: '2019-2024'
  })

  const statCards = [
    {
      title: 'Total Proposals',
      value: stats.totalProposals.toLocaleString(),
      icon: FileText,
      color: 'bg-blue-500',
      description: '5 years 8 months'
    },
    {
      title: 'Validators',
      value: stats.totalValidators.toLocaleString(),
      icon: Users,
      color: 'bg-green-500',
      description: '17 chains'
    },
    {
      title: 'Total Votes',
      value: stats.totalVotes.toLocaleString(),
      icon: Vote,
      color: 'bg-purple-500',
      description: 'All voting records'
    },
    {
      title: 'Pass Rate',
      value: `${stats.passRate}%`,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      description: 'Proposal success rate'
    },
    {
      title: 'Active Chains',
      value: stats.activeChains.toString(),
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Cosmos ecosystem'
    },
    {
      title: 'Data Period',
      value: stats.timeSpan,
      icon: Calendar,
      color: 'bg-indigo-500',
      description: '5 years 8 months'
    }
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Overall Statistics Overview</h2>
        <p className="text-gray-600">
          Check the overall status of Cosmos ecosystem governance activities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-lg bg-white border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md ${card.color} p-3`}>
                <card.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-400 mt-1">{card.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 추가 인사이트 */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Most Active Chains
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-blue-700">Osmosis</span>
              <span className="font-medium text-blue-900">809 proposals</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-700">Injective</span>
              <span className="font-medium text-blue-900">454 proposals</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-blue-700">Stargaze</span>
              <span className="font-medium text-blue-900">282 proposals</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Voting Participation Status
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-green-700">YES Vote</span>
              <span className="font-medium text-green-900">40.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700">NO_VOTE</span>
              <span className="font-medium text-green-900">42.3%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-green-700">Other Votes</span>
              <span className="font-medium text-green-900">17.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 