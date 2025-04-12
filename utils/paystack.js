export async function initializePayment(email, amount, metadata = {}) {
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: amount * 100, // Convert to kobo
        metadata,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/verify`,
      }),
    })

    const data = await response.json()
    return {
      success: data.status,
      data: data.data,
      message: data.message,
    }
  } catch (error) {
    console.error('Error initializing payment:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function verifyPayment(reference) {
  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    const data = await response.json()
    return {
      success: data.status,
      data: data.data,
      message: data.message,
    }
  } catch (error) {
    console.error('Error verifying payment:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function createSubscription(email, plan, metadata = {}) {
  try {
    const response = await fetch('https://api.paystack.co/subscription', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: email,
        plan,
        metadata,
        start_date: new Date().toISOString(),
      }),
    })

    const data = await response.json()
    return {
      success: data.status,
      data: data.data,
      message: data.message,
    }
  } catch (error) {
    console.error('Error creating subscription:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export async function disableSubscription(code) {
  try {
    const response = await fetch(`https://api.paystack.co/subscription/disable/${code}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    })

    const data = await response.json()
    return {
      success: data.status,
      data: data.data,
      message: data.message,
    }
  } catch (error) {
    console.error('Error disabling subscription:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

export const refundTransaction = async (transactionId, amount = null) => {
  try {
    const response = await fetch('https://api.paystack.co/refund', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: transactionId,
        amount: amount ? amount * 100 : undefined, // Convert to kobo if amount is specified
      }),
    })

    const data = await response.json()
    return {
      success: data.status,
      data: data.data,
      message: data.message,
    }
  } catch (error) {
    console.error('Error refunding transaction:', error)
    return {
      success: false,
      message: 'Failed to process refund',
    }
  }
} 