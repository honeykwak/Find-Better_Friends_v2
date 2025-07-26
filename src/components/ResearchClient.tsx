'use client'

import { useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useGlobalStore, type Proposal, type Vote, type Validator } from '@/stores/useGlobalStore'
import { Loader2 } from 'lucide-react'
import { Allotment } from "allotment";
import "allotment/dist/style.css";

// Dynamic imports for heavy components
const FilterPanel = dynamic(() => import('@/components/FilterPanel'), {
  loading: () => (
    <div className="w-full h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm text-gray-600">Loading filters...</p>
      </div>
    </div>
  ),
  ssr: false
})

const ValidatorHeatmap = dynamic(() => import('@/components/ValidatorHeatmap'), {
  loading: () => (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-lg font-medium text-gray-900 mb-2">Loading Heatmap Visualization...</p>
        <p className="text-sm text-gray-600">Preparing D3.js chart...</p>
      </div>
    </div>
  ),
  ssr: false
})

const BubbleHeap = dynamic(() => import('@/components/BubbleHeap'), {
  loading: () => (
    <div className="h-full bg-white flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-lg font-medium text-gray-900 mb-2">Loading Bubble Heap...</p>
      </div>
    </div>
  ),
  ssr: false
})

interface ResearchClientProps {
  initialData: {
    proposals: Proposal[];
    validators: Validator[];
    votes: Vote[];
  };
}

export default function ResearchClient({ initialData }: ResearchClientProps) {
  const { setInitialData, windowSize, setWindowSize, searchTerm } = useGlobalStore()

  // Set initial data from server into the global store
  useEffect(() => {
    if (initialData) {
      setInitialData(initialData)
    }
  }, [initialData, setInitialData])

  // Track window size
  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setWindowSize])

  const isMobileScreen = windowSize.width < 640

  return (
    <div className="flex-1 flex overflow-hidden">
      {!isMobileScreen ? (
        <Allotment>
          <Allotment.Pane minSize={160} preferredSize="20%">
            <Suspense fallback={
              <div className="w-full h-full bg-white flex items-center justify-center">
                <div className="text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="text-sm text-gray-600">Loading filters...</p>
                </div>
              </div>
            }>
              <FilterPanel />
            </Suspense>
          </Allotment.Pane>
          <Allotment.Pane>
            <Allotment>
              <Allotment.Pane>
                <div className="flex-1 flex flex-col overflow-hidden bg-white h-full">
                  <div className="flex-1 overflow-hidden">
                    <ValidatorHeatmap />
                  </div>
                </div>
              </Allotment.Pane>
              <Allotment.Pane preferredSize="30%">
                <BubbleHeap />
              </Allotment.Pane>
            </Allotment>
          </Allotment.Pane>
        </Allotment>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-hidden">
            <ValidatorHeatmap />
          </div>
        </div>
      )}
    </div>
  )
}
