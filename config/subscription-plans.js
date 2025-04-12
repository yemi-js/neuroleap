export const SUBSCRIPTION_PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      'Basic concept learning',
      'Limited analogies per day',
      'Basic progress tracking',
      'Community access'
    ],
    paystackPlanCode: null
  },
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    features: [
      'Unlimited concept learning',
      'Unlimited analogies',
      'Advanced progress tracking',
      'Priority support',
      'Custom learning paths',
      'Offline access'
    ],
    paystackPlanCode: 'PLN_xxxxx' // Replace with your actual Paystack plan code
  },
  PRO: {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    features: [
      'Everything in Basic',
      'AI-powered learning insights',
      'Personalized learning recommendations',
      'Advanced analytics',
      'Priority support',
      'Early access to new features'
    ],
    paystackPlanCode: 'PLN_yyyyy' // Replace with your actual Paystack plan code
  }
}

export function getPlanById(planId) {
  return SUBSCRIPTION_PLANS[planId.toUpperCase()] || SUBSCRIPTION_PLANS.FREE
}

export function getPlanByPaystackCode(planCode) {
  return Object.values(SUBSCRIPTION_PLANS).find(plan => plan.paystackPlanCode === planCode) || SUBSCRIPTION_PLANS.FREE
} 