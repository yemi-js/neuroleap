import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function GET() {
  try {
    console.log('OpenAI API Key set:', !!process.env.OPENAI_API_KEY)

    // Simple test completion
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.'
        },
        {
          role: 'user',
          content: 'Say "OpenAI is working!"'
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    console.log('OpenAI Response:', JSON.stringify(completion, null, 2))

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('No response from OpenAI')
    }

    const responseMessage = {
      content: completion.choices[0].message.content,
      role: completion.choices[0].message.role
    }

    return NextResponse.json({
      success: true,
      message: responseMessage,
      apiKeySet: !!process.env.OPENAI_API_KEY
    })
  } catch (error) {
    console.error('OpenAI Test Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error occurred',
      apiKeySet: !!process.env.OPENAI_API_KEY,
      errorDetails: {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: 500 })
  }
} 