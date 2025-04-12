import { supabase } from './supabase'

export const updateUserAnalytics = async (userId, data) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    
    // Get existing analytics for today
    const { data: existingAnalytics, error: fetchError } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      throw fetchError
    }

    if (existingAnalytics) {
      // Update existing analytics
      const { error: updateError } = await supabase
        .from('user_analytics')
        .update({
          total_messages: existingAnalytics.total_messages + (data.messages || 0),
          total_conversations: existingAnalytics.total_conversations + (data.conversations || 0),
          total_attachments: existingAnalytics.total_attachments + (data.attachments || 0),
          total_quizzes_taken: existingAnalytics.total_quizzes_taken + (data.quizzes || 0),
          average_quiz_score: data.quizScore 
            ? (existingAnalytics.average_quiz_score * existingAnalytics.total_quizzes_taken + data.quizScore) / (existingAnalytics.total_quizzes_taken + 1)
            : existingAnalytics.average_quiz_score,
          total_learning_time: existingAnalytics.total_learning_time + (data.learningTime || 0)
        })
        .eq('id', existingAnalytics.id)

      if (updateError) throw updateError
    } else {
      // Create new analytics entry
      const { error: insertError } = await supabase
        .from('user_analytics')
        .insert({
          user_id: userId,
          date: today,
          total_messages: data.messages || 0,
          total_conversations: data.conversations || 0,
          total_attachments: data.attachments || 0,
          total_quizzes_taken: data.quizzes || 0,
          average_quiz_score: data.quizScore || 0,
          total_learning_time: data.learningTime || 0
        })

      if (insertError) throw insertError
    }
  } catch (error) {
    console.error('Error updating user analytics:', error)
  }
}

export const updateConversationAnalytics = async (conversationId, data) => {
  try {
    const { data: existingAnalytics, error: fetchError } = await supabase
      .from('conversation_analytics')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError
    }

    if (existingAnalytics) {
      // Update existing analytics
      const { error: updateError } = await supabase
        .from('conversation_analytics')
        .update({
          total_messages: existingAnalytics.total_messages + (data.messages || 0),
          total_attachments: existingAnalytics.total_attachments + (data.attachments || 0),
          average_response_time: data.responseTime
            ? (existingAnalytics.average_response_time * existingAnalytics.total_messages + data.responseTime) / (existingAnalytics.total_messages + 1)
            : existingAnalytics.average_response_time
        })
        .eq('id', existingAnalytics.id)

      if (updateError) throw updateError
    } else {
      // Create new analytics entry
      const { error: insertError } = await supabase
        .from('conversation_analytics')
        .insert({
          conversation_id: conversationId,
          total_messages: data.messages || 0,
          total_attachments: data.attachments || 0,
          average_response_time: data.responseTime || 0
        })

      if (insertError) throw insertError
    }
  } catch (error) {
    console.error('Error updating conversation analytics:', error)
  }
}

export const getUserAnalytics = async (userId, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('user_analytics')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching user analytics:', error)
    return []
  }
}

export const getConversationAnalytics = async (conversationId) => {
  try {
    const { data, error } = await supabase
      .from('conversation_analytics')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching conversation analytics:', error)
    return null
  }
} 