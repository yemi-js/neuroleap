import { headers } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

export async function POST(req) {
  const body = await req.text()
  const signature = headers().get('stripe-signature')

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  const session = event.data.object

  switch (event.type) {
    case 'checkout.session.completed':
      // Handle successful payment
      try {
        // Update user's subscription status in your database
        // You would implement your database update logic here
        console.log('Payment successful for session:', session.id)
      } catch (err) {
        console.error('Error updating user subscription:', err)
        return new Response('Error processing payment', { status: 500 })
      }
      break

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // Handle subscription updates
      try {
        // Update subscription status in your database
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