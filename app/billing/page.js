'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { supabase } from '../../utils/supabase'
import { initializePayment, refundTransaction, disableSubscription } from '../../utils/paystack'
import { SUBSCRIPTION_PLANS, getPlanById } from '../../config/subscription-plans'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import DashboardNav from '../../components/DashboardNav'

export default function BillingPage() {
  const { user, loading } = useAuth()
  const { isDark } = useTheme()
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [billingHistory, setBillingHistory] = useState([])

  useEffect(() => {
    // Redirect if not authenticated after auth is initialized
    if (!loading && !user) {
      router.push('/')
      return
    }
    
    // Only fetch data if user is authenticated
    if (user) {
      fetchSubscriptionData()
      fetchBillingHistory()
    }
  }, [user, loading, router])

  const fetchSubscriptionData = async () => {
    try {
      // Skip if user isn't loaded yet
      if (!user?.id) return
      
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subscriptionError)
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', user.id)
        .single()

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error fetching user data:', userError)
      } else {
        setSubscription(subscriptionData || null)
        setCurrentPlan(userData ? getPlanById(userData.subscription_status) : SUBSCRIPTION_PLANS.FREE)
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error fetching subscription:', error)
      setError('Failed to load subscription data')
      setIsLoading(false)
    }
  }

  const fetchBillingHistory = async () => {
    try {
      // Skip if user isn't loaded yet
      if (!user?.id) return
      
      const { data, error } = await supabase
        .from('billing_history')
        .select('*')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false })

      if (error) {
        console.error('Error fetching billing history:', error)
      } else {
        setBillingHistory(data || [])
      }
    } catch (error) {
      console.error('Error fetching billing history:', error)
      setError('Failed to load billing history')
    }
  }

  const handleUpgrade = async (planId) => {
    try {
      setIsLoading(true)
      const plan = getPlanById(planId)
      
      // Get user email from Supabase
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      
      const result = await initializePayment(currentUser.email, plan.price, {
        userId: user.id,
        planType: planId
      })

      if (result.success) {
        window.location.href = result.data.authorization_url
      } else {
        setError('Failed to initialize payment')
      }
    } catch (error) {
      console.error('Error upgrading plan:', error)
      setError('Failed to process upgrade')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      setIsLoading(true)
      if (subscription?.paystack_subscription_id) {
        const result = await disableSubscription(subscription.paystack_subscription_id)
        if (result.success) {
          await fetchSubscriptionData()
        } else {
          setError('Failed to cancel subscription')
        }
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      setError('Failed to cancel subscription')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefund = async (transactionId) => {
    try {
      setIsLoading(true)
      const result = await refundTransaction(transactionId)
      
      if (result.success) {
        await fetchBillingHistory()
        setError(null)
      } else {
        setError(result.message || 'Failed to process refund')
      }
    } catch (error) {
      console.error('Error processing refund:', error)
      setError('Failed to process refund')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !user) {
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
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-3xl font-extrabold text-theme-light-text dark:text-theme-dark-text sm:text-4xl">
            Subscription & Billing
          </h1>
          <p className="mt-4 text-lg text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
            Manage your subscription and billing information
          </p>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 bg-red-500/10 border border-red-500/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg"
          >
            {error}
          </motion.div>
        )}

        {/* Current Plan */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 card"
        >
          <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text">Current Plan</h2>
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-theme-light-text dark:text-theme-dark-text">{currentPlan?.name}</p>
                <p className="text-theme-light-text-secondary dark:text-theme-dark-text-secondary">${currentPlan?.price}/month</p>
              </div>
              {currentPlan?.id !== 'free' && (
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="px-4 py-2 bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 
                           border border-red-500/50 rounded-lg hover:bg-red-500/20 dark:hover:bg-red-500/30 transition"
                >
                  Cancel Subscription
                </button>
              )}
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary">Features</h3>
              <ul className="mt-2 space-y-2">
                {currentPlan?.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-theme-light-text dark:text-theme-dark-text">
                    <svg className="h-5 w-5 text-accent-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Available Plans */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text mb-4">Available Plans</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Object.values(SUBSCRIPTION_PLANS).map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
                className={`card transition-all hover:transform hover:scale-105 ${
                  currentPlan?.id === plan.id 
                    ? 'ring-2 ring-accent-500/50' 
                    : 'hover:ring-2 hover:ring-accent-500/30'
                }`}
              >
                <h3 className="text-lg font-medium text-theme-light-text dark:text-theme-dark-text">{plan.name}</h3>
                <p className="mt-2 text-3xl font-bold text-theme-light-text dark:text-theme-dark-text">
                  ${plan.price}
                  <span className="text-base font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary">/month</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
                      <svg className="h-5 w-5 text-accent-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                {currentPlan?.id !== plan.id && (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isLoading}
                    className="btn-primary mt-6 w-full"
                  >
                    {currentPlan?.id === 'free' ? 'Upgrade' : 'Switch Plan'}
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Billing History */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 card"
        >
          <h2 className="text-xl font-semibold text-theme-light-text dark:text-theme-dark-text mb-4">Billing History</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-light-border dark:divide-theme-dark-border">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-theme-light-text-secondary dark:text-theme-dark-text-secondary uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-light-border dark:divide-theme-dark-border">
                {billingHistory.length > 0 ? (
                  billingHistory.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-theme-light-card dark:hover:bg-theme-dark-card">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-light-text dark:text-theme-dark-text">
                        {new Date(invoice.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-light-text dark:text-theme-dark-text">
                        ${invoice.amount}
                        {invoice.refund_amount && (
                          <span className="ml-2 text-accent-500">
                            (Refunded: ${invoice.refund_amount})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          invoice.status === 'success'
                            ? 'bg-green-500/10 dark:bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/50'
                            : invoice.status === 'refunded'
                            ? 'bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/50'
                            : 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/50'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {invoice.status === 'success' && (
                          <button
                            onClick={() => handleRefund(invoice.paystack_transaction_id)}
                            disabled={isLoading}
                            className="text-accent-500 hover:text-accent-600 dark:hover:text-accent-400"
                          >
                            Request Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-sm text-theme-light-text-secondary dark:text-theme-dark-text-secondary">
                      No billing history available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  )
} 