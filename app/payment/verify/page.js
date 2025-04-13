'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyPayment } from '../../../utils/paystack'
import { supabase } from '../../../utils/supabase'

export default function PaymentVerify() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('verifying')
  const [message, setMessage] = useState('Verifying your payment...')

  useEffect(() => {
    const reference = searchParams.get('reference')
    if (!reference) {
      setStatus('error')
      setMessage('No payment reference found')
      return
    }

    const verify = async () => {
      try {
        const result = await verifyPayment(reference)
        
        if (result.success) {
          setStatus('success')
          setMessage('Payment successful! Redirecting to dashboard...')
          
          // Update user's subscription status
          await supabase
            .from('users')
            .update({
              subscription_status: 'premium',
              subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', result.data.metadata.userId)

          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
        } else {
          setStatus('error')
          setMessage('Payment verification failed. Please contact support.')
        }
      } catch (error) {
        console.error('Error verifying payment:', error)
        setStatus('error')
        setMessage('An error occurred while verifying your payment.')
      }
    }

    verify()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          {status === 'verifying' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          )}
          {status === 'success' && (
            <div className="text-green-500 text-4xl mb-4">✓</div>
          )}
          {status === 'error' && (
            <div className="text-red-500 text-4xl mb-4">✕</div>
          )}
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {status === 'verifying' && 'Verifying Payment'}
            {status === 'success' && 'Payment Successful'}
            {status === 'error' && 'Payment Failed'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
} 