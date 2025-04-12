'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { motion } from 'framer-motion'

export default function DashboardNav() {
  const { user, logout } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const pathname = usePathname()
  
  const handleLogout = async () => {
    await logout()
  }
  
  const isActive = (path) => {
    return pathname === path
  }
  
  if (!user) return null
  
  return (
    <div className="bg-theme-light-bg dark:bg-theme-dark-bg border-b border-theme-light-border dark:border-theme-dark-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-theme-light-text dark:text-theme-dark-text">
              NeuroLeap
            </Link>
            
            <div className="hidden md:block ml-10">
              <div className="flex space-x-4">
                <NavLink 
                  href="/dashboard" 
                  isActive={isActive('/dashboard')}
                >
                  Dashboard
                </NavLink>
                <NavLink 
                  href="/chat" 
                  isActive={isActive('/chat')}
                >
                  Chat
                </NavLink>
                <NavLink 
                  href="/concepts" 
                  isActive={isActive('/concepts')}
                >
                  Concepts
                </NavLink>
                <NavLink 
                  href="/billing" 
                  isActive={isActive('/billing')}
                >
                  Billing
                </NavLink>
              </div>
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

            <Link 
              href="/profile" 
              className={`nav-link ${isActive('/profile') ? 'active' : ''}`}
            >
              Profile
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 
                       rounded-md hover:bg-red-500/20 dark:hover:bg-red-500/30 transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile nav for smaller screens */}
      <div className="md:hidden border-t border-theme-light-border dark:border-theme-dark-border">
        <div className="grid grid-cols-4 divide-x divide-theme-light-border dark:divide-theme-dark-border">
          <NavLinkMobile 
            href="/dashboard" 
            isActive={isActive('/dashboard')}
            label="Dashboard"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            }
          />
          <NavLinkMobile 
            href="/chat" 
            isActive={isActive('/chat')}
            label="Chat"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
          />
          <NavLinkMobile 
            href="/concepts" 
            isActive={isActive('/concepts')}
            label="Concepts"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            }
          />
          <NavLinkMobile 
            href="/profile" 
            isActive={isActive('/profile')}
            label="Profile"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  )
}

function NavLink({ href, isActive, children }) {
  return (
    <Link
      href={href}
      className={`nav-link ${isActive ? 'active' : ''}`}
    >
      {children}
    </Link>
  )
}

function NavLinkMobile({ href, isActive, label, icon }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center py-2 transition
        ${isActive 
          ? 'text-theme-light-text dark:text-theme-dark-text bg-theme-light-card dark:bg-theme-dark-card' 
          : 'text-theme-light-text-secondary dark:text-theme-dark-text-secondary hover:text-theme-light-text dark:hover:text-theme-dark-text'
        }`}
    >
      <div className="mb-1">{icon}</div>
      <span className="text-xs">{label}</span>
    </Link>
  )
} 