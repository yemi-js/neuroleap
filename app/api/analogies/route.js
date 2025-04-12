import { NextResponse } from 'next/server'
import { generateAnalogy } from '../../../utils/openai'
import { auth } from '@clerk/nextjs'

export async function POST(req) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { concept, difficultyLevel } = await req.json()

    if (!concept) {
      return NextResponse.json(
        { error: 'Concept is required' },
        { status: 400 }
      )
    }

    const response = await generateAnalogy(concept, difficultyLevel || 'intermediate')

    if (!response.success) {
      return NextResponse.json(
        { error: response.message },
        { status: 500 }
      )
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in analogies route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 