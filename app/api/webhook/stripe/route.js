import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripeSecret = process.env.STRIPE_SECRET_KEY
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2023-10-16' }) : null

export async function POST(req) {
  if (!stripeSecret || !webhookSecret) {
    console.warn('Stripe not configured – webhook disabled.')
    return new Response('Stripe not configured', { status: 200 })
  }

  const body = await req.text()
  const signature = headers().get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const session = event.data.object

  switch (event.type) {
    case 'checkout.session.completed':
      try {
        console.log('Payment successful for session:', session.id)
      } catch (err) {
        console.error('Error updating user subscription:', err)
        return new Response('Error processing payment', { status: 500 })
      }
      break

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      try {
        console.log('Subscription updated for customer:', session.customer)
      } catch (err) {
        console.error('Error updating subscription:', err)
        return new Response('Error updating subscription', { status: 500 })
      }
      break
  }

  return new Response(JSON.stringify({ received: true }))
}

export async function GET() {
  return new Response('Method not allowed', { status: 405 })
}
