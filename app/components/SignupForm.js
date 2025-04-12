'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../utils/supabase'
import { TONE_OPTIONS, INTEREST_OPTIONS } from '../../utils/options'
import { Loader2 } from 'lucide-react' // optional loading icon from lucide-react
  

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedTone, setSelectedTone] = useState('')
  const [customTone, setCustomTone] = useState('')
  const [selectedInterests, setSelectedInterests] = useState([])
  const [customInterest, setCustomInterest] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })
      if (authError) throw authError

      const interests = [...selectedInterests]
      if (customInterest.trim()) interests.push(customInterest.trim())

      const { error: profileError } = await supabase.from('user_profiles').insert([
        {
          user_id: authData.user.id,
          full_name: fullName.trim(),
          teaching_tone: customTone.trim() || selectedTone,
          interests,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      if (profileError) throw profileError

      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Signup error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-theme-light-bg dark:bg-theme-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="card"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-theme-light-text dark:text-theme-dark-text">
              Create Your Account
            </h2>
            <p className="mt-2 text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
              Customize your learning experience in seconds
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <InputField label="Full Name" value={fullName} setValue={setFullName} required placeholder="e.g. Olayemi A." />
              <InputField label="Email Address" type="email" value={email} setValue={setEmail} required placeholder="you@example.com" />
              <InputField label="Password" type="password" value={password} setValue={setPassword} required placeholder="Create a secure password" />
            </div>

            {/* Teaching Tone */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">
                Choose Your AI's Teaching Style
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {TONE_OPTIONS.map(tone => (
                  <motion.button
                    layout
                    key={tone.id}
                    type="button"
                    onClick={() => setSelectedTone(tone.id)}
                    className={`p-4 rounded-lg text-left transition border ${
                      selectedTone === tone.id
                        ? 'bg-accent-500 text-white border-transparent shadow-lg'
                        : 'bg-theme-light-card dark:bg-theme-dark-card hover:shadow-md border border-gray-300 dark:border-gray-700 text-theme-light-text dark:text-theme-dark-text'
                    }`}
                  >
                    <div className="text-2xl mb-2">{tone.emoji}</div>
                    <div className="font-medium">{tone.label}</div>
                    <div className="text-sm opacity-80">{tone.description}</div>
                  </motion.button>
                ))}
              </div>

              <InputField
                label="Custom Teaching Style (Optional)"
                value={customTone}
                setValue={setCustomTone}
                placeholder="e.g., like a cool older sibling"
              />
            </div>

            {/* Interests */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">
                Pick Your Interests (Select Multiple)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {INTEREST_OPTIONS.map(interest => (
                  <motion.button
                    layout
                    key={interest.id}
                    type="button"
                    onClick={() =>
                      setSelectedInterests(prev =>
                        prev.includes(interest.id)
                          ? prev.filter(i => i !== interest.id)
                          : [...prev, interest.id]
                      )
                    }
                    className={`p-4 rounded-lg text-left transition border ${
                      selectedInterests.includes(interest.id)
                        ? 'bg-accent-500 text-white border-transparent shadow-lg'
                        : 'bg-theme-light-card dark:bg-theme-dark-card hover:shadow-md border border-gray-300 dark:border-gray-700 text-theme-light-text dark:text-theme-dark-text'
                    }`}
                  >
                    <div className="text-2xl mb-2">{interest.emoji}</div>
                    <div className="font-medium">{interest.label}</div>
                    <div className="text-sm opacity-80">{interest.description}</div>
                  </motion.button>
                ))}
              </div>

              <InputField
                label="Custom Interest (Optional)"
                value={customInterest}
                setValue={setCustomInterest}
                placeholder="e.g., like a fashion designer"
              />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-600 dark:text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="animate-spin w-5 h-5" />}
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  )
}

function InputField({ label, value, setValue, type = 'text', required = false, placeholder = '' }) {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-theme-light-text dark:text-theme-dark-text">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="input mt-1 w-full"
      />
    </div>
  )
}
