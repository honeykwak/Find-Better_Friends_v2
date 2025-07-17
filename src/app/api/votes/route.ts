import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chain = searchParams.get('chain')

  if (!chain) {
    return NextResponse.json({ message: 'Chain parameter is required' }, { status: 400 })
  }

  const filePath = path.join(process.cwd(), 'public', 'data', chain, 'votes.json')

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    const votes = JSON.parse(fileContent)
    return NextResponse.json(votes)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(`File not found for chain ${chain} at path: ${filePath}`)
      return NextResponse.json({ message: `Vote data not found for chain: ${chain}` }, { status: 404 })
    }
    console.error(`Failed to read or parse votes data for chain ${chain}:`, error)
    return NextResponse.json({ message: 'Error reading or parsing votes data' }, { status: 500 })
  }
}
