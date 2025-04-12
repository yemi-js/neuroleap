'use server'

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { OpenAI } from 'openai'
import { NextResponse } from 'next/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const TONE_DESCRIPTIONS = {
  expert: 'You are a university professor, providing precise and technical explanations with academic rigor.',
  friendly: 'You are a supportive friend, offering warm and encouraging explanations while maintaining accuracy.',
  direct: 'You provide clear, concise explanations without any unnecessary elaboration.',
  excited: 'You are enthusiastic and energetic, making learning engaging and fun while maintaining accuracy.',
  nerdy: 'You are passionate about the subject, incorporating relevant fun facts and geeky references.',
  storyteller: 'You explain concepts through engaging stories and relatable analogies.',
  calm: 'You maintain a gentle, relaxed tone while explaining concepts clearly.',
  playful: 'You incorporate humor and quirky examples while ensuring understanding.',
  professional: 'You maintain a corporate, formal tone suitable for workplace learning.'
}

export async function POST(req) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 401 })
    }
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user preferences
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .single()

    // Parse request body
    const body = await req.json()
    const { messages, conversationId, topic } = body
    
    if (!messages || !Array.isArray(messages) || !conversationId) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }

    // Verify conversation belongs to user
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', session.user.id)
      .single()

    if (conversationError || !conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Prepare system message based on user preferences
    let systemContent = ''
    
    // Add teaching style
    if (userProfile?.teaching_tone) {
      if (userProfile.teaching_tone === 'custom' && userProfile.custom_tone) {
        systemContent += `You are an AI tutor who teaches ${userProfile.custom_tone}. `
      } else if (TONE_DESCRIPTIONS[userProfile.teaching_tone]) {
        systemContent += TONE_DESCRIPTIONS[userProfile.teaching_tone] + ' '
      }
    }

    // Add interests for analogies
    if (userProfile?.interests?.length > 0) {
      systemContent += 'When explaining concepts, use analogies and examples from the following areas: '
      const interests = userProfile.interests.map(interest => {
        switch (interest) {
          case 'cars': return 'automotive and mechanical systems'
          case 'sports': return 'sports and athletics'
          case 'music': return 'music and sound'
          case 'tech': return 'technology and computing'
          case 'cooking': return 'cooking and culinary arts'
          case 'gaming': return 'video games and gaming'
          case 'psychology': return 'psychology and human behavior'
          case 'movies': return 'movies and television'
          case 'nature': return 'nature and ecosystems'
          case 'architecture': return 'architecture and construction'
          case 'travel': return 'travel and exploration'
          case 'entrepreneurship': return 'business and entrepreneurship'
          default: return interest
        }
      }).join(', ')
      systemContent += interests + '. '
    }

    // Add custom interest if present
    if (userProfile?.custom_interest) {
      systemContent += `Also use analogies from: ${userProfile.custom_interest}. `
    }

    // Add topic focus if present
    if (topic) {
      systemContent += `Focus on providing accurate and relevant information about ${topic}.`
    }

    const systemMessage = {
      role: 'system',
      content: systemContent || 'You are a helpful AI assistant. Provide accurate and relevant information.'
    }

    // Format messages for OpenAI
    const formattedMessages = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ]

    console.log('Sending to OpenAI:', JSON.stringify(formattedMessages, null, 2))

    // Get OpenAI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 1000
    })

    console.log('OpenAI Response:', JSON.stringify(completion, null, 2))

    if (!completion.choices || completion.choices.length === 0) {
      throw new Error('No response from OpenAI')
    }

    const assistantMessage = {
      role: completion.choices[0].message.role,
      content: completion.choices[0].message.content
    }

    // Save message to database
    const { error: messageError } = await supabase
      .from('conversation_messages')
      .insert([
        {
          conversation_id: conversationId,
          role: assistantMessage.role,
          content: assistantMessage.content
        }
      ])

    if (messageError) {
      throw new Error('Failed to save message to database')
    }

    // Update conversation title if this is the first message
    const { count } = await supabase
      .from('conversation_messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)

    if (count === 2) { // First user message + first AI response
      const firstMessage = messages[0].content
      const title = firstMessage.length > 50 
        ? firstMessage.substring(0, 50) + '...'
        : firstMessage

      const { error: updateError } = await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId)

      if (updateError) {
        console.error('Failed to update conversation title:', updateError)
      }
    }

    return NextResponse.json({
      success: true,
      message: assistantMessage
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    }, { status: 500 })
  }
} 