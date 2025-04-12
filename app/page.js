'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import Image from 'next/image'
import { motion } from 'framer-motion'
import SignupForm from './components/SignupForm'

export default function Home() {
  const { user, login, register, loading } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isLoginView, setIsLoginView] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  // Ensure component is mounted before rendering user-dependent UI
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      const { success, error } = await login(email, password)
      if (!success) throw new Error(error || 'Failed to sign in')
      setSuccess('Successfully signed in!')
      setShowAuthModal(false)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  }

  return (
    <div className="min-h-screen bg-theme-light-bg dark:bg-theme-dark-bg">
      <nav className="relative z-10 border-b border-theme-light-border dark:border-theme-dark-border bg-theme-light-card/50 dark:bg-theme-dark-card/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="text-xl font-bold text-theme-light-text dark:text-theme-dark-text">
                NeuroLeap
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-theme-light-card dark:bg-theme-dark-card text-theme-light-text dark:text-theme-dark-text"
              >
                {isDark ? '🌞' : '🌙'}
              </button>

              {isMounted && user ? (
                <>
                  <Link href="/dashboard" className="nav-link">
                    Dashboard
                  </Link>
                  <div className="h-6 w-px bg-theme-light-border dark:bg-theme-dark-border"></div>
                  <Link href="/profile" className="nav-link">
                    Profile
                  </Link>
                </>
              ) : isMounted && !user ? (
                <>
                  <button 
                    onClick={() => {
                      setIsLoginView(true)
                      setShowAuthModal(true)
                    }}
                    className="btn-secondary"
                  >
                    Sign In
                  </button>
                  <button 
                    onClick={() => {
                      setIsLoginView(false)
                      setShowAuthModal(true)
                    }}
                    className="btn-primary"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                // Initial state before mount - show empty buttons to maintain layout
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-20 bg-theme-light-card dark:bg-theme-dark-card rounded-md"></div>
                  <div className="h-10 w-20 bg-accent-500 rounded-md"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-theme-light-text dark:text-theme-dark-text">
              <span className="block">Learn Through</span>
              <span className="block text-accent-500 mt-2">Powerful Analogies</span>
            </h1>
            <p className="mt-6 text-xl text-theme-light-text-secondary dark:text-theme-dark-text-secondary max-w-2xl mx-auto lg:mx-0">
              Master complex concepts by understanding their relationships and patterns through AI-powered analogical learning.
            </p>
            {isMounted && user && (
              <div className="mt-10">
                <Link href="/dashboard" className="btn-primary inline-block">
                  Go to Dashboard
                </Link>
              </div>
            )}
          </motion.div>

          {isMounted && !user && (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="card"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-theme-light-text dark:text-theme-dark-text">
                  {isLoginView ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary mt-2">
                  {isLoginView ? 'Sign in to your account' : 'Join our learning community'}
                </p>
              </div>

              {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {success && (
                <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
                  {success}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-theme-light-text dark:text-theme-dark-text">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="input mt-1"
                    placeholder="Enter your email"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-theme-light-text dark:text-theme-dark-text">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="input mt-1"
                    placeholder="Enter your password"
                  />
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Processing...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setIsLoginView(false)}
                  className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary hover:text-theme-light-text dark:hover:text-theme-dark-text text-sm"
                >
                  Don't have an account? Sign Up
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <section className="py-20 bg-theme-light-card dark:bg-theme-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-theme-light-text dark:text-theme-dark-text mb-4">
              Why Choose Analogical Learning?
            </h2>
            <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
              Experience a revolutionary way of learning
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                title: 'AI-Powered Learning',
                description: 'Advanced AI technology creates personalized learning experiences through relatable analogies.',
                icon: '🤖'
              },
              {
                title: 'Interactive Conversations',
                description: 'Engage in natural conversations to deepen your understanding of complex topics.',
                icon: '💬'
              },
              {
                title: 'Track Progress',
                description: 'Monitor your learning journey with detailed analytics and progress tracking.',
                icon: '📊'
              }
            ].map((feature, index) => (
              <div key={index} className="card text-center p-8">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text mb-2">
                  {feature.title}
                </h3>
                <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How NeuroLeap Works</h2>
            <p className="text-indigo-200">Begin your journey to enhanced learning through neural connections</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Join NeuroLeap',
                description: 'Create your personalized learning profile'
              },
              {
                step: '2',
                title: 'Select Your Path',
                description: 'Choose your learning domains'
              },
              {
                step: '3',
                title: 'Neural Learning',
                description: 'Experience AI-enhanced neural connections'
              },
              {
                step: '4',
                title: 'Master Concepts',
                description: 'Apply and reinforce your knowledge'
              }
            ].map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-indigo-200">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-black/30 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">NeuroLeap</h3>
              <p className="text-indigo-200">Revolutionizing learning through neural-enhanced AI technology.</p>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-indigo-200 hover:text-white">About</Link></li>
                <li><Link href="/pricing" className="text-indigo-200 hover:text-white">Pricing</Link></li>
                <li><Link href="/contact" className="text-indigo-200 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link href="/blog" className="text-indigo-200 hover:text-white">Blog</Link></li>
                <li><Link href="/faq" className="text-indigo-200 hover:text-white">FAQ</Link></li>
                <li><Link href="/support" className="text-indigo-200 hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-indigo-200 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-indigo-200 hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center">
            <p className="text-indigo-200">&copy; {new Date().getFullYear()} NeuroLeap. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-theme-light-card dark:bg-theme-dark-card rounded-xl p-6  w-full max-h-[90vh] overflow-y-auto"
          >
            {isLoginView ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-theme-light-text dark:text-theme-dark-text">
                    Welcome Back
                  </h2>
                  <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary mt-2">
                    Sign in to your account
                  </p>
                </div>

                {error && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="mb-6 bg-green-500/10 border border-green-500/50 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg">
                    {success}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-theme-light-text dark:text-theme-dark-text">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="input mt-1"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-theme-light-text dark:text-theme-dark-text">
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="input mt-1"
                      placeholder="Enter your password"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Processing...' : 'Sign In'}
                    </button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setIsLoginView(false)}
                    className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary hover:text-theme-light-text dark:hover:text-theme-dark-text text-sm"
                  >
                    Don't have an account? Sign Up
                  </button>
                </div>
              </>
            ) : (
              <SignupForm onSuccess={() => setShowAuthModal(false)} />
            )}

            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-theme-light-text-secondary dark:text-theme-dark-text-secondary hover:text-theme-light-text dark:hover:text-theme-dark-text"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
} 