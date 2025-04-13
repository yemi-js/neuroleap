import { headers } from 'next/headers'
import crypto from 'crypto'
import { supabase } from '@/utils/supabase'

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('x-paystack-signature')

  // Verify Paystack webhook signature
  const hash = crypto
    .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(body)
    .digest('hex')

  if (hash !== signature) {
    return new Response('Invalid signature', { status: 400 })
  }

  const event = JSON.parse(body)

  try {
    switch (event.event) {
      case 'charge.success':
        // Handle successful payment
        const { data: transaction } = event
        const { customer, metadata } = transaction

        // Update user's subscription status in database
        const { data: userSubscription, error: subscriptionError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: metadata.userId,
            paystack_customer_id: customer.customer_code,
            paystack_subscription_id: transaction.subscription,
            plan_type: metadata.planType,
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          })
          .select()
          .single()

        if (subscriptionError) throw subscriptionError

        // Record billing history
        const { error: billingError } = await supabase
          .from('billing_history')
          .insert({
            user_id: metadata.userId,
            subscription_id: userSubscription.id,
            amount: transaction.amount / 100, // Convert from kobo to naira
            currency: transaction.currency,
            status: 'success',
            paystack_transaction_id: transaction.id,
            paystack_reference: transaction.reference,
            payment_date: new Date().toISOString()
          })

        if (billingError) throw billingError

        break

      case 'refund.processed':
        // Handle refund
        const { data: refund } = event

        // Update billing history record
        const { error: refundError } = await supabase
          .from('billing_history')
          .update({
            status: 'refunded',
            refund_amount: refund.amount / 100,
            refund_date: new Date().toISOString()
          })
          .eq('paystack_transaction_id', refund.transaction)

        if (refundError) throw refundError

        // If this was a subscription payment, update subscription status
        if (refund.subscription) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              current_period_end: new Date().toISOString()
            })
            .eq('paystack_subscription_id', refund.subscription)
        }

        break

      case 'subscription.disable':
        // Handle subscription cancellation
        const { data: cancelledSubscription } = event

        await supabase
          .from('subscriptions')
          .update({
            status: 'cancelled',
            current_period_end: new Date().toISOString(),
          })
          .eq('paystack_subscription_id', cancelledSubscription.subscription_code)

        break

      case 'subscription.expiring':
        // Handle subscription expiration
        const { data: expiringSubscription } = event

        await supabase
          .from('subscriptions')
          .update({
            status: 'expiring',
          })
          .eq('paystack_subscription_id', expiringSubscription.subscription_code)

        break

      case 'subscription.create':
        // Handle new subscription creation
        const { data: newSubscription } = event

        // Record initial subscription payment
        const { error: initialBillingError } = await supabase
          .from('billing_history')
          .insert({
            user_id: newSubscription.customer.id,
            subscription_id: newSubscription.id,
            amount: newSubscription.amount / 100,
            currency: newSubscription.currency,
            status: 'success',
            paystack_transaction_id: newSubscription.transaction,
            paystack_reference: newSubscription.reference,
            payment_date: new Date().toISOString()
          })

        if (initialBillingError) throw initialBillingError

        break
    }

    return new Response(JSON.stringify({ received: true }))
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }
}

export async function GET() {
  return new Response('Method not allowed', { status: 405 })
} 