import { Metadata } from 'next'
import { loadChainData } from '@/lib/dataLoader'
import ResearchClient from '@/components/ResearchClient'
import Header from '@/components/Header'
import { Loader2 } from 'lucide-react'
import { Suspense } from 'react'

export const metadata: Metadata = {
  title: 'Blockchain Governance Voting Visualization Research',
  description: 'Cosmos Ecosystem Governance Voting Data Analysis and Visualization Research',
}

export default async function HomePage() {
  // 1. Fetch data on the server
  const initialData = await loadChainData('cosmos');

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Header />
      <Suspense fallback={
        <div className="h-full bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Governance Data</h2>
            <p className="text-gray-600">Preparing validator analysis...</p>
          </div>
        </div>
      }>
        {/* 2. Pass the fetched data to the client component */}
        <ResearchClient initialData={initialData} />
      </Suspense>
    </div>
  )
}