'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../utils/supabase'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import DashboardNav from '../../components/DashboardNav'

export default function Dashboard() {
  const { user, loading, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState(null)
  const [recentConcepts, setRecentConcepts] = useState([])
  const [userProgress, setUserProgress] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dailyFlashcards, setDailyFlashcards] = useState([])
  const [dailyQuizzes, setDailyQuizzes] = useState([])
  const [flashcardsCompleted, setFlashcardsCompleted] = useState(0)
  const [quizzesCompleted, setQuizzesCompleted] = useState(0)
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
      return
    }
    
    if (user) {
      fetchUserData()
      fetchDailyContent()
    }
  }, [user, loading, router])
  
  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError)
      } else {
        setUserProfile(profileData || null)
      }
      
      // Fetch recent concepts
      const { data: conceptsData, error: conceptsError } = await supabase
        .from('concepts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4)
      
      if (conceptsError) {
        console.error('Error fetching concepts:', conceptsError)
      } else {
        setRecentConcepts(conceptsData || [])
      }
      
      // Fetch user progress
      const { data: progressData, error: progressError } = await supabase
        .from('user_analytics')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (progressError && progressError.code !== 'PGRST116') {
        console.error('Error fetching analytics:', progressError)
      } else {
        setUserProgress(progressData || {
          total_messages: 0,
          total_conversations: 0,
          total_attachments: 0,
          quizzes_taken: 0,
          average_quiz_score: 0,
          total_learning_time: 0
        })
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error)
      setError('Failed to load user data')
    } finally {
      setIsLoading(false)
    }
  }
  
  const generateFlashcardsWithAI = async (topics) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "user",
            content: `Generate 10 flashcards with unknown facts for the following topics: ${topics.join(', ')}. 
            Return the response in this JSON format:
            {
              "flashcards": [
                {
                  "id": "1",
                  "topic": "topic_name",
                  "fact": "interesting fact",
                  "seen": false
                }
              ]
            }`
          }]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate flashcards')
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)
      return result.flashcards
    } catch (error) {
      console.error('Error generating flashcards:', error)
      throw error
    }
  }

  const generateQuizzesWithAI = async (topics) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{
            role: "user",
            content: `Generate 3 multiple choice quiz questions for the following topics: ${topics.join(', ')}.
            Return the response in this JSON format:
            {
              "quizzes": [
                {
                  "id": "1",
                  "topic": "topic_name",
                  "question": "quiz question",
                  "options": ["option1", "option2", "option3", "option4"],
                  "correctAnswer": "correct_option",
                  "completed": false
                }
              ]
            }`
          }]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate quizzes')
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)
      return result.quizzes
    } catch (error) {
      console.error('Error generating quizzes:', error)
      throw error
    }
  }
  
  const fetchDailyContent = async () => {
    try {
      // Get today's date as a string
      const today = new Date().toISOString().split('T')[0]
      
      // Check local storage for today's content
      const storedContent = localStorage.getItem(`dailyContent_${today}`)
      if (storedContent) {
        const { flashcards, quizzes } = JSON.parse(storedContent)
        setDailyFlashcards(flashcards)
        setDailyQuizzes(quizzes)
        
        // Still need to fetch completion status from the database
        await fetchCompletionStatus()
        return
      }

      // Fetch user's interests from user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('interests')
        .eq('user_id', user.id)
        .single()

      if (profileError) throw profileError

      const interests = profileData?.interests || []
      if (interests.length === 0) {
        setError('Please set your interests in your profile to get personalized content')
        return
      }

      // Generate new content with OpenAI
      const [flashcards, quizzes] = await Promise.all([
        generateFlashcardsWithAI(interests),
        generateQuizzesWithAI(interests)
      ])

      // Store in local storage
      localStorage.setItem(`dailyContent_${today}`, JSON.stringify({
        flashcards,
        quizzes
      }))

      // Update state
      setDailyFlashcards(flashcards)
      setDailyQuizzes(quizzes)

      // Fetch completion status
      await fetchCompletionStatus()

    } catch (error) {
      console.error('Error fetching daily content:', error)
      setError('Failed to load daily learning content')
    }
  }

  const fetchCompletionStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]

      // Fetch completed flashcards count for today
      const { data: flashcardData, error: flashcardError } = await supabase
        .from('completed_flashcards')
        .select('count')
        .eq('user_id', user.id)
        .eq('completed_date', today)
        .single()

      if (!flashcardError) {
        setFlashcardsCompleted(flashcardData?.count || 0)
        
        // Update seen status in local storage
        if (flashcardData?.count > 0) {
          const storedContent = localStorage.getItem(`dailyContent_${today}`)
          if (storedContent) {
            const content = JSON.parse(storedContent)
            content.flashcards = content.flashcards.map((card, index) => ({
              ...card,
              seen: index < flashcardData.count
            }))
            localStorage.setItem(`dailyContent_${today}`, JSON.stringify(content))
            setDailyFlashcards(content.flashcards)
          }
        }
      }

      // Fetch completed quizzes for today
      const { data: quizData, error: quizError } = await supabase
        .from('completed_quizzes')
        .select('quiz_id, score')
        .eq('user_id', user.id)
        .eq('completed_date', today)

      if (!quizError) {
        setQuizzesCompleted(quizData?.length || 0)
        
        // Update completed status in local storage
        if (quizData?.length > 0) {
          const storedContent = localStorage.getItem(`dailyContent_${today}`)
          if (storedContent) {
            const content = JSON.parse(storedContent)
            content.quizzes = content.quizzes.map(quiz => ({
              ...quiz,
              completed: quizData.some(q => q.quiz_id === quiz.id)
            }))
            localStorage.setItem(`dailyContent_${today}`, JSON.stringify(content))
            setDailyQuizzes(content.quizzes)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching completion status:', error)
    }
  }

  const markFlashcardComplete = async (cardId) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Update the completed_flashcards table
      const { error } = await supabase
        .from('completed_flashcards')
        .upsert({
          user_id: user.id,
          completed_date: today,
          count: flashcardsCompleted + 1
        })

      if (error) throw error

      // Update local state
      setFlashcardsCompleted(prev => prev + 1)
      setDailyFlashcards(prev => 
        prev.map(card => 
          card.id === cardId ? { ...card, seen: true } : card
        )
      )
    } catch (error) {
      console.error('Error marking flashcard complete:', error)
      setError('Failed to update flashcard progress')
    }
  }

  const submitQuizAnswer = async (quizId, answer) => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const quiz = dailyQuizzes.find(q => q.id === quizId)
      const isCorrect = quiz.correctAnswer === answer

      // Save quiz result
      const { error } = await supabase
        .from('completed_quizzes')
        .insert({
          user_id: user.id,
          quiz_id: quizId,
          completed_date: today,
          score: isCorrect ? 100 : 0
        })

      if (error) throw error

      // Update local state
      setQuizzesCompleted(prev => prev + 1)
      setDailyQuizzes(prev =>
        prev.map(q =>
          q.id === quizId ? { ...q, completed: true, userAnswer: answer } : q
        )
      )
    } catch (error) {
      console.error('Error submitting quiz answer:', error)
      setError('Failed to submit quiz answer')
    }
  }
  
  const handleLogout = async () => {
    try {
      const { success, error: logoutError } = await logout()
      if (!success) {
        throw new Error(logoutError || 'Failed to log out')
      }
    } catch (error) {
      console.error('Error logging out:', error)
      setError('Failed to log out')
    }
  }
  
  // Show loading state if auth is loading or page data is loading
  if (loading || (user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-light-bg dark:bg-theme-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    )
  }
  
  // Should not normally reach here due to redirect, but just in case
  if (!user) {
    return null
  }
  
  const formatLearningTime = (minutes) => {
    if (!minutes) return '0 min'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    return `${hours}h ${remainingMinutes}m`
  }
  
  return (
    <div className="min-h-screen bg-theme-light-bg dark:bg-theme-dark-bg">
      <DashboardNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl font-bold text-theme-light-text dark:text-theme-dark-text">
              Welcome, {userProfile?.full_name || user.email}
            </h1>
            <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary mt-1">
              Your current plan: <span className="font-semibold">{userProfile?.subscription_status || 'Free'}</span>
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 lg:mt-0 flex space-x-4"
          >
            <Link href="/chat" className="btn-primary">
              Start Learning
            </Link>
            <Link href="/billing" className="btn-secondary">
              Manage Billing
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 
                       font-medium rounded-lg hover:bg-red-500/20 dark:hover:bg-red-500/30 transition"
            >
              Sign Out
            </button>
          </motion.div>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        {/* Progress Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8"
        >
          {[
            { name: 'Conversations', value: userProgress?.total_conversations || 0, icon: '📝' },
            { name: 'Messages', value: userProgress?.total_messages || 0, icon: '💬' },
            // { name: 'Attachments', value: userProgress?.total_attachments || 0, icon: '📎' },
            { name: 'Quizzes Taken', value: userProgress?.quizzes_taken || 0, icon: '📚' },
            { name: 'Quiz Avg Score', value: `${Math.round(userProgress?.average_quiz_score || 0)}%`, icon: '🎯' },
            { name: 'Learning Time', value: formatLearningTime(userProgress?.total_learning_time || 0), icon: '⏱️' }
          ].map((stat, index) => (
            <motion.div
              key={stat.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + (index * 0.05) }}
              className="card flex flex-col items-center"
            >
              <div className="text-2xl">{stat.icon}</div>
              <div className="text-xl font-bold text-theme-light-text dark:text-theme-dark-text mt-2">{stat.value}</div>
              <div className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary text-sm">{stat.name}</div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Daily Flashcards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card mb-8"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">Daily Flashcards</h2>
            <span className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
              {flashcardsCompleted}/10 Completed
            </span>
          </div>

          {dailyFlashcards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dailyFlashcards.map((card) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`card ${card.seen ? 'opacity-50' : ''}`}
                >
                  <div className="text-sm text-accent-500 mb-2">{card.topic}</div>
                  <p className="text-theme-light-text dark:text-theme-dark-text mb-4">{card.fact}</p>
                  {!card.seen && (
                    <button
                      onClick={() => markFlashcardComplete(card.id)}
                      className="btn-secondary w-full"
                    >
                      Mark as Seen
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
              You've completed all flashcards for today!
            </p>
          )}
        </motion.div>

        {/* Daily Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="card"
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">Daily Quizzes</h2>
            <span className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
              {quizzesCompleted}/3 Completed
            </span>
          </div>

          {dailyQuizzes.length > 0 ? (
            <div className="space-y-6">
              {dailyQuizzes.map((quiz) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`card ${quiz.completed ? 'opacity-50' : ''}`}
                >
                  <div className="text-sm text-accent-500 mb-2">{quiz.topic}</div>
                  <p className="text-theme-light-text dark:text-theme-dark-text mb-4">{quiz.question}</p>
                  {!quiz.completed ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {quiz.options.map((option) => (
                        <button
                          key={option}
                          onClick={() => submitQuizAnswer(quiz.id, option)}
                          className="btn-secondary"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
                      Your answer: {quiz.userAnswer}
                      {quiz.userAnswer === quiz.correctAnswer ? (
                        <span className="text-green-500 ml-2">✓ Correct!</span>
                      ) : (
                        <span className="text-red-500 ml-2">✗ Incorrect. Correct answer: {quiz.correctAnswer}</span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
              You've completed all quizzes for today!
            </p>
          )}
        </motion.div>
        
        {/* Recent Concepts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="card"
        >
          <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text mb-4">Recent Topics</h2>
          
          {recentConcepts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentConcepts.map((concept, index) => (
                <motion.div
                  key={concept.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 + (index * 0.1) }}
                  className="card hover:ring-2 hover:ring-accent-500/50 transition-all cursor-pointer"
                >
                  <h3 className="font-medium text-theme-light-text dark:text-theme-dark-text">{concept.name}</h3>
                  <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary text-sm mt-1 line-clamp-2">
                    {concept.description}
                  </p>
                  <div className="mt-3 flex justify-between items-center">
                    <span className="bg-accent-500/10 text-xs text-accent-600 dark:text-accent-400 px-2 py-1 rounded">
                      {concept.category || 'General'}
                    </span>
                    <Link
                      href={`/concepts/${concept.id}`}
                      className="text-accent-500 text-sm hover:text-accent-600 dark:hover:text-accent-400"
                    >
                      Learn More →
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
              No concepts available yet. Start learning to explore topics!
            </p>
          )}
          
          <div className="mt-4 text-center">
            <Link href="/concepts" className="btn-secondary">
              View All Topics
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 