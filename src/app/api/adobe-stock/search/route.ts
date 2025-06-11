import { NextRequest, NextResponse } from 'next/server'
import { getAdobeStockClient } from '@/lib/adobe-stock'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const keywords = searchParams.get('keywords')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const orientation = searchParams.get('orientation') as any
    const contentType = searchParams.get('contentType') as any

    if (!keywords) {
      return NextResponse.json(
        { error: 'Keywords parameter is required' },
        { status: 400 }
      )
    }

    const client = getAdobeStockClient()
    const results = await client.search({
      keywords,
      limit,
      offset,
      filters: {
        orientation,
        contentType,
        hasReleases: true
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Adobe Stock search error:', error)
    return NextResponse.json(
      { error: 'Failed to search Adobe Stock' },
      { status: 500 }
    )
  }
}