import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe, STRIPE_WEBHOOK_SECRET } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/stripe/webhook — Stripe webhook handler.
 * Set STRIPE_WEBHOOK_SECRET and point Stripe Dashboard → Developers → Webhooks to this URL.
 * Events: invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted
 */
export async function POST(req: NextRequest) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabase = serviceKey
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
    : null

  try {
    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_failed':
        // Stripe sends customer emails by default; optional: store in billing_events for in-app notifications
        break
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.supabase_user_id
        if (userId && supabase) {
          await supabase.from('profiles').update({
            updated_at: new Date().toISOString(),
          }).eq('id', userId).catch(() => {})
        }
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
