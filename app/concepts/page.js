'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useRouter } from 'next/navigation'
import DashboardNav from '../../components/DashboardNav'

export default function ConceptsPage() {
  const { user, loading } = useAuth()
  const { isDark } = useTheme()
  const router = useRouter()
  
  useEffect(() => {
    // Redirect if not authenticated after auth is initialized
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])
  
  // Show loading state if auth is loading
  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-theme-light-bg dark:bg-theme-dark-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500"></div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-theme-light-bg dark:bg-theme-dark-bg">
      <DashboardNav />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-theme-light-text dark:text-theme-dark-text">
            Concepts Library
          </h1>
          <p className="mt-4 text-xl text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
            The concepts library is currently being developed. Check back soon to explore our growing collection of learning materials.
          </p>
        </div>
      </div>
    </div>
  )
} 