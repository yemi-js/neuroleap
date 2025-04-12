'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../utils/supabase'
import { useRouter } from 'next/navigation'
import DashboardNav from '../../components/DashboardNav'
import { useTheme } from '../../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import ReactMarkdown from 'react-markdown'; 


export default function ChatPage() {
  const router = useRouter()
  const { isDark } = useTheme()
  // const { user } = useAuth()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [topic, setTopic] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const messagesEndRef = useRef(null)
  const [typingMessage, setTypingMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef(null)
  const [teachingPreferences, setTeachingPreferences] = useState({
    tone: null,
    interest: []
  })

  useEffect(() => {
    checkUser()
    // fetchTeachingPreferences()
  }, [])

  const fetchTeachingPreferences = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('teaching_tone, interests')
        .eq('user_id', userId)
        .single()
  
      if (error) throw error
  
      // Store teaching preferences in the state
      setTeachingPreferences({
        tone: data.teaching_tone,
        interest: data.interests
      })
    } catch (error) {
      console.error('Error fetching teaching preferences:', error)
      setError('Failed to load teaching preferences')
    }
  }

  

  const checkUser = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error

      if (!session) {
        router.push('/')
        return
      }

      setUser(session.user)
      setLoading(false)
      fetchConversations(session.user.id)
      fetchTeachingPreferences(session.user.id)
    } catch (error) {
      console.error('Error checking auth:', error)
      router.push('/')
    }
  }

  const generateAIPrompt = (tone, interest) => {
    return `
      You're a highly intelligent tutor on NeuroLeap, the analogical learning platform.
  
      Your task is to teach by using analogies, metaphors, and real-world examples based on the user's preferred context: **${interest}**.
      
      The user prefers a **${tone}** tone.
      
      Be clear, creative, and helpful. Always relate answers back to **${interest}** when possible. For example:
      - If interest = "Cars", relate concepts to engines, gears, fuel, sensors, etc.
      - If interest = "Music", relate to rhythm, harmony, instruments, composition.
      
      **Your response should always be formatted beautifully**:
      - Use **bold text** for key concepts or important points.
      - Use *italics* for emphasis.
      - Structure your responses with **clear headings**, bullet points, and short paragraphs.
      - Make your explanations easy to follow, with clear transitions between ideas.
      
      **IMPORTANT:**
      - If the user asks for an image or visual representation (e.g., "Can you show me an image of X?"), include an image related to the query.
      - If the user does not ask for an image but instead wants a text-based explanation, provide that in an easy-to-read format with well-organized content.
      - **For example**: If the user asks, "Can you show me an image of a cat?", generate an image of a cat. If the user asks, "Explain how gears work," provide a detailed text explanation without generating any images.
  
      Keep responses rich but concise. No fluff. Focus on clarity and beauty in your formatting.
    `.trim();
  };
  

   // Function to render formatted message content
   const renderMessageContent = (content) => {
    // If the content has an image URL, display it
    if (content.image_url) {
      return (
        <img src={content.image_url} alt="Generated" className="max-w-full rounded-lg" />
      );
    }

    // If the content is in markdown or HTML, render it safely
    return (
      <div
        className="message-content"
        dangerouslySetInnerHTML={{ __html: content }} // You can use a sanitizer here if needed
      />
    );
  };
  

  useEffect(() => {
    if (currentConversation) {
      fetchMessages(currentConversation.id)
    }
  }, [currentConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConversations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const fetchMessages = async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const createNewConversation = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      console.log('Creating new conversation:', {
        user_id: user.id,
        title: 'New Conversation',
        topic: topic || null
      })

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: 'New Conversation',
          topic: topic || null
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error('No data returned from insert')
      }

      console.log('Conversation created:', data)
      setConversations([data, ...conversations])
      setCurrentConversation(data)
      setShowNewChat(false)
      setTopic('')
    } catch (error) {
      console.error('Error creating conversation:', error)
      alert(`Failed to create conversation: ${error.message}`)
    }
  }

  const simulateTyping = (text) => {
    setIsTyping(true)
    let index = 0
    setTypingMessage('')

    const typeChar = () => {
      if (index < text.length) {
        setTypingMessage(prev => prev + text[index])
        index++
        typingTimeoutRef.current = setTimeout(typeChar, Math.random() * 10 + 20) // Random delay between 20-50ms
      } else {
        setIsTyping(false)
      }
    }

    typeChar()
  }

  // Cleanup typing animation on unmount or conversation change
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [currentConversation])




  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentConversation) return;
  
    setIsLoading(true);
    try {
      // Save user message to the conversation
      const { data: messageData, error: messageError } = await supabase
        .from('conversation_messages')
        .insert([
          {
            conversation_id: currentConversation.id,
            role: 'user',
            content: newMessage
          }
        ])
        .select()
        .single();
  
      if (messageError) throw messageError;
  
      // Update messages state
      const updatedMessages = [...messages, messageData];
      setMessages(updatedMessages);
      setNewMessage('');
  
      // Fetch user teaching preferences
      await fetchTeachingPreferences(user.id); // Assuming `fetchTeachingPreferences` updates the state
  
      if (!teachingPreferences) throw new Error("Failed to load teaching preferences");
  
      // Generate the AI prompt based on fetched preferences
      const { tone, interest } = teachingPreferences;
      const prompt = generateAIPrompt(tone, interest);
  
      // Get AI response from OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            ...updatedMessages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            { role: 'system', content: prompt }, // Add custom prompt here
          ],
        }),
      });
  
      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content;
  
      // Check if image generation is requested (based on the content of the AI response)
      let imageUrl = null;
      if (aiReply.includes("show me an image") || aiReply.includes("create an image")) {
        // Assuming the AI response includes an instruction like "create an image of a cat"
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'dall-e', // Or another image generation model
            prompt: aiReply, // Use the AI response as the prompt
            n: 1, // Generate 1 image
            size: '1024x1024', // Image size
          }),
        });
  
        const imageData = await imageResponse.json();
        imageUrl = imageData.data?.[0]?.url; // Extract the image URL from the response
      }
  
      // Start typing animation
      simulateTyping(aiReply);
  
      // Save AI response to the conversation
      const { data: aiMessageData, error: aiError } = await supabase
        .from('conversation_messages')
        .insert([
          {
            conversation_id: currentConversation.id,
            role: 'assistant',
            content: aiReply,
            image_url: imageUrl, // Add the image URL to the message data
          }
        ])
        .select()
        .single();
  
      if (aiError) throw aiError;
  
      // Update messages state with AI response after typing animation
      setTimeout(() => {
        setMessages([...updatedMessages, aiMessageData]);
      }, aiReply.length * 30); // Approximate time to finish typing
  
      // Update conversation if title changed
      const { data: updatedConversation, error: convError } = await supabase
        .from('conversations')
        .select()
        .eq('id', currentConversation.id)
        .single();
  
      if (!convError && updatedConversation && updatedConversation.title !== currentConversation.title) {
        setConversations(conversations.map(conv =>
          conv.id === currentConversation.id ? updatedConversation : conv
        ));
        setCurrentConversation(updatedConversation);
      }
  
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.message || 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };
  
  

  // Show loading state if auth is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-light-bg dark:bg-theme-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-theme-light-bg dark:bg-theme-dark-bg">
      <DashboardNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1 card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">
                Conversations
              </h2>
              <button
                onClick={() => setShowNewChat(true)}
                className="btn-secondary rounded-full p-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {showNewChat && (
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Enter topic (optional)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="input mb-2"
                />
                <button
                  onClick={createNewConversation}
                  className="btn-primary w-full"
                >
                  Start New Chat
                </button>
              </div>
            )}

            <div className="space-y-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setCurrentConversation(conv)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    currentConversation?.id === conv.id
                      ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400'
                      : 'hover:bg-theme-light-card dark:hover:bg-theme-dark-card text-theme-light-text-secondary dark:text-theme-dark-text-secondary'
                  }`}
                >
                  <div className="font-medium truncate">{conv.title}</div>
                  {conv.topic && (
                    <div className="text-sm text-theme-light-text-secondary dark:text-theme-dark-text-secondary truncate">
                      Topic: {conv.topic}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="md:col-span-3 flex flex-col h-[calc(100vh-12rem)]">
      {currentConversation ? (
        <>
          {/* Messages */}
          <div className="flex-1 card overflow-y-auto mb-4">
            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-accent-500 text-white'
                          : 'bg-theme-light-card dark:bg-theme-dark-card text-theme-light-text dark:text-theme-dark-text shadow-lg'
                      }`}
                    >
                       {/* Render the message content with react-markdown */}
                  {/* Render the message content with react-markdown */}
{message.content.includes('image_url') ? (
  <div>
    <ReactMarkdown>{message.content}</ReactMarkdown>
    <img src={message.image_url} alt="AI-generated" />
  </div>
) : (
  <ReactMarkdown>{message.content}</ReactMarkdown>
)}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="max-w-[80%] rounded-lg p-3 bg-theme-light-card dark:bg-theme-dark-card text-theme-light-text dark:text-theme-dark-text shadow-lg">
                    {typingMessage}
                    <span className="inline-flex ml-1">
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="w-1 h-1 bg-current rounded-full mx-0.5"
                      />
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                        className="w-1 h-1 bg-current rounded-full mx-0.5"
                      />
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                        className="w-1 h-1 bg-current rounded-full mx-0.5"
                      />
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="input flex-1"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !newMessage.trim()}
              className="btn-primary px-6"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </>
      ) : (
        <div className="text-center text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
          Please select or create a conversation
        </div>
      )}
    </div>


        </div>
      </div>
    </div>
  )
}
