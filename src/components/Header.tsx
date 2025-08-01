'use client'

import ColorGuide from './ui/ColorGuide'

export default function Header() {
  return (
    <div className="flex-shrink-0 bg-neutral-600 border-b border-gray-200 px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="h1-title text-white">
            ContextualAllianceVIS
          </h1>
        </div>
      </div>
    </div>
  )
}
