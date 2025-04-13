'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { verifyPayment } from '../../../utils/paystack'
import { supabase } from '../../../utils/supabase'

// Create a client component for the verification logic
function VerificationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [verificationStatus, setVerificationStatus] = useState('verifying')
  const [error, setError] = useState(null)

  useEffect(() => {
    async function verifyTransaction() {
      try {
        const reference = searchParams.get('reference')
        if (!reference) {
          setError('No reference found')
          return
        }

        // Verify the payment
        const result = await verifyPayment(reference)
        if (result.status === 'success') {
          // Update user subscription in database
          const { error: dbError } = await supabase
            .from('user_subscriptions')
            .update({ status: 'active', last_payment_reference: reference })
            .eq('user_id', result.user_id)

          if (dbError) throw dbError

          setVerificationStatus('success')
          // Redirect to dashboard after 2 seconds
          setTimeout(() => router.push('/dashboard'), 2000)
        } else {
          setVerificationStatus('failed')
          setError(result.message || 'Payment verification failed')
        }
      } catch (err) {
        setVerificationStatus('failed')
        setError(err.message || 'An error occurred during verification')
      }
    }

    verifyTransaction()
  }, [searchParams, router])

  if (error) {
    return (
      <div className="text-red-500">
        <p>Error: {error}</p>
        <button
          onClick={() => router.push('/billing')}
          className="mt-4 btn-primary"
        >
          Return to Billing
        </button>
      </div>
    )
  }

  return (
    <div className="text-center">
      {verificationStatus === 'verifying' && (
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
          <p className="mt-4">Verifying your payment...</p>
        </div>
      )}
      {verificationStatus === 'success' && (
        <div className="text-green-500">
          <p>Payment verified successfully!</p>
          <p className="mt-2">Redirecting to dashboard...</p>
        </div>
      )}
      {verificationStatus === 'failed' && (
        <div className="text-red-500">
          <p>Payment verification failed.</p>
          <button
            onClick={() => router.push('/billing')}
            className="mt-4 btn-primary"
          >
            Return to Billing
          </button>
        </div>
      )}
    </div>
  )
}

// Main page component with Suspense boundary
export default function PaymentVerify() {
  return (
    <div className="min-h-screen bg-theme-light-bg dark:bg-theme-dark-bg flex items-center justify-center p-4">
      <div className="card max-w-md w-full p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">Payment Verification</h1>
        <Suspense fallback={
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
            <p className="mt-4">Loading...</p>
          </div>
        }>
          <VerificationContent />
        </Suspense>
      </div>
    </div>
  )
} 