'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { getUserConversations, createConversation, generateResponse } from '../utils/openai'
import { uploadFile, getConversationFiles } from '../utils/fileUpload'
import { updateUserAnalytics, updateConversationAnalytics, getConversationAnalytics } from '../utils/analytics'

export default function ChatInterface() {
  const { user } = useUser()
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [files, setFiles] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      loadConversations()
    }
  }, [user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (currentConversation) {
      loadFiles()
      loadAnalytics()
    }
  }, [currentConversation])

  const loadConversations = async () => {
    try {
      const userConversations = await getUserConversations(user.id)
      setConversations(userConversations)
    } catch (error) {
      console.error('Error loading conversations:', error)
      setError('Failed to load conversations')
    }
  }

  const loadFiles = async () => {
    try {
      const { success, files: conversationFiles } = await getConversationFiles(currentConversation.id)
      if (success) {
        setFiles(conversationFiles)
      }
    } catch (error) {
      console.error('Error loading files:', error)
    }
  }

  const loadAnalytics = async () => {
    try {
      const analyticsData = await getConversationAnalytics(currentConversation.id)
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      setLoading(true)
      const conversation = await createConversation(user.id, 'New Conversation')
      if (conversation) {
        setConversations([conversation, ...conversations])
        setCurrentConversation(conversation)
        setMessages([])
        setFiles([])
        setAnalytics(null)
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
      setError('Failed to create new conversation')
    } finally {
      setLoading(false)
    }
  }

  const loadConversation = async (conversationId) => {
    try {
      setLoading(true)
      const conversation = conversations.find(c => c.id === conversationId)
      if (conversation) {
        setCurrentConversation(conversation)
        // Load messages for this conversation
        const response = await fetch(`/api/chat/${conversationId}`)
        const data = await response.json()
        if (data.success) {
          setMessages(data.messages)
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      setError('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const files = e.target.files
    if (!files.length || !currentConversation) return

    try {
      setLoading(true)
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const result = await uploadFile(file, currentConversation.id, user.id)
        
        if (result.success) {
          setFiles([result.attachment, ...files])
          // Update analytics
          await updateUserAnalytics(user.id, { attachments: 1 })
          await updateConversationAnalytics(currentConversation.id, { attachments: 1 })
        } else {
          setError(result.error || 'Failed to upload file')
        }
      }
    } catch (error) {
      console.error('Error uploading files:', error)
      setError('Failed to upload files')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!inputMessage.trim() || !currentConversation) return

    try {
      setLoading(true)
      const startTime = Date.now()
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversationId: currentConversation.id,
        }),
      })

      const data = await response.json()
      if (data.success) {
        setMessages([...messages, 
          { role: 'user', content: inputMessage },
          { role: 'assistant', content: data.message }
        ])
        setInputMessage('')

        // Update analytics
        const responseTime = Math.floor((Date.now() - startTime) / 1000) // in seconds
        await updateUserAnalytics(user.id, { messages: 1 })
        await updateConversationAnalytics(currentConversation.id, { 
          messages: 1,
          responseTime
        })
        await loadAnalytics()
      } else {
        setError(data.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError('Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations Sidebar */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
        <button
          onClick={createNewConversation}
          disabled={loading}
          className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 mb-4"
        >
          New Conversation
        </button>
        
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => loadConversation(conversation.id)}
              className={`w-full text-left px-4 py-2 rounded-md ${
                currentConversation?.id === conversation.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'hover:bg-gray-100'
              }`}
            >
              {conversation.title}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentConversation ? (
          <>
            {/* Analytics Summary */}
            {analytics && (
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Messages</div>
                    <div className="text-lg font-semibold">{analytics.total_messages}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Attachments</div>
                    <div className="text-lg font-semibold">{analytics.total_attachments}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Avg Response Time</div>
                    <div className="text-lg font-semibold">{Math.round(analytics.average_response_time)}s</div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Files */}
            {files.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Attachments</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-2 border rounded-md hover:bg-gray-50"
                    >
                      <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <span className="text-sm truncate">{file.file_name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 rounded-md border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={loading}
                />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.txt,.doc,.docx"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <button
                  type="submit"
                  disabled={loading || !inputMessage.trim()}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a conversation or start a new one
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  )
} 