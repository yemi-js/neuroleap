import { supabase } from './supabase'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

export const uploadFile = async (file, conversationId, userId) => {
  try {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds 10MB limit')
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error('File type not supported')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `${userId}/${conversationId}/${fileName}`

    // Upload file to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(filePath)

    // Save file metadata to database
    const { data: attachment, error: dbError } = await supabase
      .from('file_attachments')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: publicUrl
      })
      .select()
      .single()

    if (dbError) throw dbError

    return {
      success: true,
      attachment
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export const deleteFile = async (fileId) => {
  try {
    // Get file information
    const { data: file, error: fetchError } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('id', fileId)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage
    const filePath = file.file_url.split('/').slice(-3).join('/')
    const { error: storageError } = await supabase.storage
      .from('attachments')
      .remove([filePath])

    if (storageError) throw storageError

    // Delete from database
    const { error: dbError } = await supabase
      .from('file_attachments')
      .delete()
      .eq('id', fileId)

    if (dbError) throw dbError

    return {
      success: true
    }
  } catch (error) {
    console.error('Error deleting file:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

export const getConversationFiles = async (conversationId) => {
  try {
    const { data, error } = await supabase
      .from('file_attachments')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      success: true,
      files: data
    }
  } catch (error) {
    console.error('Error fetching conversation files:', error)
    return {
      success: false,
      error: error.message
    }
  }
} 