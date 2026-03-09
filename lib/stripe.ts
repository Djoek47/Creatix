import Stripe from 'stripe'

/**
 * Server-side Stripe client. Requires STRIPE_SECRET_KEY.
 * For Checkout/Portal: set STRIPE_PRICE_ID (subscription price) and configure
 * Customer Portal at https://dashboard.stripe.com/settings/billing/portal
 */
const secret = process.env.STRIPE_SECRET_KEY
export const stripe = secret ? new Stripe(secret, { typescript: true }) : null

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET
