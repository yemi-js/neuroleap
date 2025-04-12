import OpenAI from 'openai'
import { supabase } from './supabase'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const MAX_CONTEXT_LENGTH = 10 // Maximum number of messages to keep in context

export const getUserContext = async (userId, conversationId) => {
  try {
    const { data: messages, error } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MAX_CONTEXT_LENGTH)

    if (error) throw error

    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  } catch (error) {
    console.error('Error fetching user context:', error)
    return []
  }
}

export const addToContext = async (conversationId, message) => {
  try {
    const { error } = await supabase
      .from('conversation_messages')
      .insert({
        conversation_id: conversationId,
        role: message.role,
        content: message.content
      })

    if (error) throw error
  } catch (error) {
    console.error('Error adding to context:', error)
  }
}

export const createConversation = async (userId, title) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        title: title
      })
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating conversation:', error)
    return null
  }
}

export const getUserConversations = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user conversations:', error)
    return []
  }
}

export const generateResponse = async (userId, conversationId, userMessage) => {
  try {
    const context = await getUserContext(userId, conversationId)
    
    // Add user message to context
    await addToContext(conversationId, { role: 'user', content: userMessage })

    // Prepare messages array with system message and context
    const messages = [
      {
        role: 'system',
        content: `You are an AI tutor specializing in analogical learning. 
        Your goal is to help users understand complex concepts through analogies and examples.
        You should be patient, encouraging, and adapt your explanations to the user's level of understanding.
        If the user is struggling, provide simpler analogies or break down the concept further.
        Always maintain a supportive and educational tone.`
      },
      ...context
    ]

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    })

    const aiResponse = completion.choices[0].message.content

    // Add AI response to context
    await addToContext(conversationId, { role: 'assistant', content: aiResponse })

    return {
      success: true,
      message: aiResponse
    }
  } catch (error) {
    console.error('Error generating response:', error)
    return {
      success: false,
      message: 'Failed to generate response. Please try again.'
    }
  }
}

export const generateAnalogy = async (concept, difficultyLevel) => {
  try {
    const prompt = `Create a clear and engaging analogy to explain the concept of "${concept}" at a ${difficultyLevel} level. 
    Include both the analogy and a detailed explanation of how it relates to the concept.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating educational analogies that make complex concepts easy to understand.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    return {
      success: true,
      analogy: completion.choices[0].message.content
    }
  } catch (error) {
    console.error('Error generating analogy:', error)
    return {
      success: false,
      message: 'Failed to generate analogy. Please try again.'
    }
  }
}

export const generateExercise = async (concept, difficultyLevel) => {
  try {
    const prompt = `Create a practice exercise for the concept of "${concept}" at a ${difficultyLevel} level. 
    Include a question, the correct answer, and a detailed explanation.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating educational exercises that test understanding and reinforce learning.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    })

    return {
      success: true,
      exercise: completion.choices[0].message.content
    }
  } catch (error) {
    console.error('Error generating exercise:', error)
    return {
      success: false,
      message: 'Failed to generate exercise. Please try again.'
    }
  }
}

export async function evaluateResponse(concept, userResponse, correctAnswer) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert at evaluating analogical reasoning and providing constructive feedback."
        },
        {
          role: "user",
          content: `Evaluate this response for the concept "${concept}":
            Correct answer: ${correctAnswer}
            User's response: ${userResponse}
            
            Provide feedback on the accuracy and completeness of the analogy, and suggest improvements if needed.`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    })

    return {
      feedback: completion.choices[0].message.content,
      success: true
    }
  } catch (error) {
    console.error('Error evaluating response:', error)
    return {
      feedback: null,
      success: false,
      error: error.message
    }
  }
}

export const generateQuiz = async (concept, difficultyLevel) => {
  try {
    const prompt = `Create a comprehensive quiz for the concept of "${concept}" at a ${difficultyLevel} level.
    Include 5 multiple-choice questions with 4 options each.
    For each question, provide:
    1. The question
    2. The options (A, B, C, D)
    3. The correct answer
    4. A detailed explanation of why the correct answer is right
    Format the response as JSON.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: 'system',
          content: 'You are an expert at creating educational quizzes that test understanding and reinforce learning.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    return {
      success: true,
      quiz: JSON.parse(completion.choices[0].message.content)
    }
  } catch (error) {
    console.error('Error generating quiz:', error)
    return {
      success: false,
      message: 'Failed to generate quiz. Please try again.'
    }
  }
}

export const generateConceptExplanation = async (concept, difficultyLevel) => {
  try {
    const prompt = `Create a comprehensive explanation of the concept "${concept}" at a ${difficultyLevel} level.
    Include:
    1. A clear definition
    2. Key components or principles
    3. Real-world examples
    4. Common misconceptions
    5. Practical applications
    Format the response as JSON.`

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: 'system',
          content: 'You are an expert at explaining complex concepts in a clear and engaging way.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    })

    return {
      success: true,
      explanation: JSON.parse(completion.choices[0].message.content)
    }
  } catch (error) {
    console.error('Error generating concept explanation:', error)
    return {
      success: false,
      message: 'Failed to generate explanation. Please try again.'
    }
  }
} 