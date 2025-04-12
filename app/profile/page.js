'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../utils/supabase'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import DashboardNav from '../../components/DashboardNav'
import { TONE_OPTIONS, INTEREST_OPTIONS } from '../../utils/options'

export default function ProfilePage() {
  const { user, loading, changePassword } = useAuth()
  const { isDark } = useTheme()
  const router = useRouter()
  const [userProfile, setUserProfile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [updateSuccess, setUpdateSuccess] = useState(false)
  const [error, setError] = useState(null)
  
  // Form states
  const [fullName, setFullName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [teachingPreferences, setTeachingPreferences] = useState(null)
  const [isEditingPreferences, setIsEditingPreferences] = useState(false)
  
  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
      return
    }
    
    if (user) {
      fetchUserProfile()
      fetchTeachingPreferences()
    }
  }, [user, loading, router])
  
  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
  
      // Get the authenticated user's ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error fetching user:', userError);
        setError('Failed to fetch user data');
        return;
      }
  
      const userId = userData?.user?.id;
      if (!userId) {
        setError('No authenticated user found');
        return;
      }
  
      // Fetch the user profile from the user_profiles table using user_id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
  
      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Failed to load profile data');
      } else {
        setUserProfile(profileData || {});
        setFullName(profileData?.full_name || ''); // Assuming 'full_name' is a column in the user_profiles table
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTeachingPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('teaching_tone, custom_tone, interests')
        .eq('user_id', user.id)
        .single()

      if (error) throw error
      setTeachingPreferences(data || { teaching_tone: null, custom_tone: '', interests: [] })
    } catch (error) {
      console.error('Error fetching teaching preferences:', error)
      setError('Failed to load teaching preferences')
    }
  }
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setError(null)
    setUpdateSuccess(false)
    
    try {
      setIsLoading(true)
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
      
      if (updateError) throw updateError
      
      await fetchUserProfile()
      setIsEditing(false)
      setUpdateSuccess(true)
    } catch (error) {
      console.error('Error updating profile:', error)
      setError(error.message || 'Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async (e) => {
    e.preventDefault()
    setError(null)
    setUpdateSuccess(false)

    try {
      if (newPassword !== confirmPassword) {
        throw new Error('New passwords do not match')
      }

      const { success, error: passwordError } = await changePassword(newPassword)
      if (!success) throw new Error(passwordError || 'Failed to update password')

      setUpdateSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setError(error.message || 'Failed to update password')
    }
  }

  const handleTeachingPreferencesUpdate = async (e) => {
    e.preventDefault()
    setError(null)
    setUpdateSuccess(false)
  
    try {
      setIsLoading(true)
  
      // Check if the user profile exists
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
  
      if (error) throw error
  
      if (data) {
        // If the user profile exists, update it
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            teaching_tone: teachingPreferences.teaching_tone,
            full_name: fullName,
            custom_tone: teachingPreferences.custom_tone,
            interests: teachingPreferences.interests,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
        
        if (updateError) throw updateError
      } else {
        // If the user profile doesn't exist, insert it
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            teaching_tone: teachingPreferences.teaching_tone,
            full_name: fullName,
            custom_tone: teachingPreferences.custom_tone,
            interests: teachingPreferences.interests,
            updated_at: new Date().toISOString()
          })
  
        if (insertError) throw insertError
      }
  
      await fetchTeachingPreferences()
      setUpdateSuccess(true)
    } catch (error) {
      console.error('Error updating teaching preferences:', error)
      setError(error.message || 'Failed to update teaching preferences')
    } finally {
      setIsLoading(false)
    }
  }
    
  
  if (loading || (user && isLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-light-bg dark:bg-theme-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    )
  }
  
  if (!user) return null
  
  return (
    <div className="min-h-screen bg-theme-light-bg dark:bg-theme-dark-bg">
      <DashboardNav />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-8"
        >
          <h1 className="text-3xl font-bold text-theme-light-text dark:text-theme-dark-text">Your Profile</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-theme-light-card dark:bg-theme-dark-card text-theme-light-text dark:text-theme-dark-text px-4 py-2 rounded-lg hover:bg-theme-light-card-hover dark:hover:bg-theme-dark-card-hover transition"
            >
              Back to Dashboard
            </button>
          </div>
        </motion.div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}
        
        {updateSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 bg-green-500/10 border border-green-500/50 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg"
          >
            Profile updated successfully!
          </motion.div>
        )}
        
        {/* Basic Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-theme-light-card dark:bg-theme-dark-card border border-theme-light-border dark:border-theme-dark-border rounded-xl p-6 shadow-xl mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">Basic Information</h2>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
          
          {isEditing ? (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 bg-theme-light-input dark:bg-theme-dark-input border border-theme-light-border dark:border-theme-dark-border rounded-lg text-theme-light-text dark:text-theme-dark-text cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-theme-light-text-secondary dark:text-theme-dark-text-secondary">Email address cannot be changed</p>
              </div>
              
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                  Full Name
                </label>
                <input
  type="text"
  id="fullName"
  value={fullName}
  onChange={(e) => setFullName(e.target.value)}
  className="w-full px-4 py-3 bg-theme-light-input dark:bg-theme-dark-input border border-theme-light-border dark:border-theme-dark-border rounded-lg text-theme-light-text dark:text-black focus:ring-2 focus:ring-accent-500 focus:border-transparent"
  placeholder="Enter your full name"
/>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                  Email Address
                </label>
                <p className="text-theme-light-text dark:text-theme-dark-text">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                  Full Name
                </label>
                <p className="text-theme-light-text dark:text-theme-dark-text">{fullName}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Teaching Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-theme-light-card dark:bg-theme-dark-card border border-theme-light-border dark:border-theme-dark-border rounded-xl p-6 shadow-xl mb-8"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">Teaching Preferences</h2>
            <button
              onClick={() => setIsEditingPreferences(!isEditingPreferences)}
              className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition"
            >
              {isEditingPreferences ? 'Cancel' : 'Edit Preferences'}
            </button>
          </div>

          {isEditingPreferences ? (
            <form onSubmit={handleTeachingPreferencesUpdate} className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-theme-light-text dark:text-theme-dark-text mb-4">Teaching Style</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {TONE_OPTIONS.map((tone) => (
                    <button
                      key={tone.id}
                      type="button"
                      onClick={() => setTeachingPreferences({
                        ...teachingPreferences,
                        teaching_tone: tone.id
                      })}
                      className={`p-4 rounded-lg text-left transition ${
                        teachingPreferences?.teaching_tone === tone.id
                          ? 'bg-accent-500 text-white'
                          : 'bg-theme-light-card dark:bg-theme-dark-card hover:bg-theme-light-card-hover dark:hover:bg-theme-dark-card-hover text-theme-light-text dark:text-theme-dark-text'
                      }`}
                    >
                      <div className="text-2xl mb-2">{tone.emoji}</div>
                      <div className="font-medium">{tone.label}</div>
                      <div className="text-sm opacity-80">{tone.description}</div>
                    </button>
                  ))}
                </div>

                <div className="mb-4">
                  <label htmlFor="customTone" className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                    Custom Teaching Style
                  </label>
                  <input
                    type="text"
                    id="customTone"
                    value={teachingPreferences?.custom_tone || ''}
                    onChange={(e) => setTeachingPreferences({
                      ...teachingPreferences,
                      custom_tone: e.target.value,
                      teaching_tone: e.target.value ? 'custom' : teachingPreferences.teaching_tone
                    })}
                    className="input"
                    placeholder="e.g., like a cool older sibling"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-theme-light-text dark:text-theme-dark-text mb-4">Learning Interests</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest.id}
                      type="button"
                      onClick={() => {
                        const interests = teachingPreferences?.interests || []
                        const newInterests = interests.includes(interest.id)
                          ? interests.filter(i => i !== interest.id)
                          : [...interests, interest.id]
                        setTeachingPreferences({
                          ...teachingPreferences,
                          interests: newInterests
                        })
                      }}
                      className={`p-3 rounded-lg text-center transition ${
                        teachingPreferences?.interests?.includes(interest.id)
                          ? 'bg-accent-500 text-white'
                          : 'bg-theme-light-card dark:bg-theme-dark-card hover:bg-theme-light-card-hover dark:hover:bg-theme-dark-card-hover text-theme-light-text dark:text-theme-dark-text'
                      }`}
                    >
                      <div className="text-2xl mb-1">{interest.emoji}</div>
                      <div className="text-sm font-medium">{interest.label}</div>
                    </button>
                  ))}
                </div>

                <div className="mt-4">
                  <label htmlFor="customInterest" className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                    Custom Interest
                  </label>
                  <input
                    type="text"
                    id="customInterest"
                    value={teachingPreferences?.custom_interest || ''}
                    onChange={(e) => setTeachingPreferences({
                      ...teachingPreferences,
                      custom_interest: e.target.value,
                      interests: e.target.value
                        ? [...(teachingPreferences?.interests || []).filter(i => i !== 'custom'), 'custom']
                        : (teachingPreferences?.interests || []).filter(i => i !== 'custom')
                    })}
                    className="input"
                    placeholder="e.g., Quantum Computing"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                  Teaching Style
                </h3>
                <p className="text-theme-light-text dark:text-theme-dark-text">
                  {TONE_OPTIONS.find(t => t.id === teachingPreferences?.teaching_tone)?.label || 
                   teachingPreferences?.custom_tone ||
                   'Not set'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                  Learning Interests
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(teachingPreferences?.interests || []).map(interestId => {
                    const interest = INTEREST_OPTIONS.find(i => i.id === interestId)
                    return interest ? (
                      <span key={interest.id} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-accent-500/10 text-accent-500">
                        {interest.emoji} {interest.label}
                      </span>
                    ) : null
                  })}
                  {teachingPreferences?.custom_interest && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-accent-500/10 text-accent-500">
                      🎯 {teachingPreferences.custom_interest}
                    </span>
                  )}
                  {(!teachingPreferences?.interests?.length && !teachingPreferences?.custom_interest) && (
                    <span className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
                      No interests selected
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-theme-light-card dark:bg-theme-dark-card border border-theme-light-border dark:border-theme-dark-border rounded-xl p-6 shadow-xl"
        >
          <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text mb-6">Change Password</h2>
          
          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input"
                placeholder="Enter your current password"
                required
              />
            </div>
            
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="Enter your new password"
                required
              />
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm your new password"
                required
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="btn-primary"
                disabled={!currentPassword || !newPassword || !confirmPassword}
              >
                Update Password
              </button>
            </div>
          </form>

          
        </motion.div>

        {/* Account Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-theme-light-card dark:bg-theme-dark-card border border-theme-light-border dark:border-theme-dark-border rounded-xl p-6 shadow-xl"
        >
          <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text mb-6">Account Management</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-theme-light-text dark:text-theme-dark-text font-medium">Billing Information</h3>
                <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary text-sm">
                  Manage your subscription and payment details
                </p>
              </div>
              <button
                onClick={() => router.push('/billing')}
                className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition"
              >
                Manage Billing →
              </button>
            </div>
            
            <div className="border-t border-theme-light-border dark:border-theme-dark-border pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-theme-light-text dark:text-theme-dark-text font-medium">Data & Privacy</h3>
                  <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary text-sm">
                    Download your data or delete your account
                  </p>
                </div>
                <button
                  className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400 transition"
                  onClick={() => {
                    alert('This action would be confirmed in a real application before proceeding.')
                  }}
                >
                  Request Data
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 