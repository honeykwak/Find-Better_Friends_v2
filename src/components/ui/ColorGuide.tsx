'use client'

import React from 'react'
import { LEGEND_ITEMS } from '@/constants/voteColors'

export default function ColorGuide() {
  return (
    <div className="flex items-center gap-4 text-xs">
      {LEGEND_ITEMS.map(item => (
        <span key={item.option} className="flex items-center gap-1.5" title={item.description}>
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
          <span className="text-gray-600">{item.label.replace('_', ' ')}</span>
        </span>
      ))}
    </div>
  )
}
