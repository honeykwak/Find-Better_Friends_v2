'use client'

import ColorGuide from './ui/ColorGuide'

export default function Header() {
  return (
    <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Governance Research Platform
          </h1>
          <ColorGuide />
        </div>
      </div>
    </div>
  )
}
