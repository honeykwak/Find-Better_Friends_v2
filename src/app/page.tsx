import { Metadata } from 'next'
import ResearchLayout from '@/components/ResearchLayout'

export const metadata: Metadata = {
  title: 'Blockchain Governance Voting Visualization Research',
  description: 'Cosmos Ecosystem Governance Voting Data Analysis and Visualization Research',
}

export default function HomePage() {
  return <ResearchLayout />
}
