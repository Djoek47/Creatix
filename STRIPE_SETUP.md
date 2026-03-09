# Stripe: Billing, Notifications & Security

Billing is handled by **Stripe** (Checkout for subscriptions, Customer Portal for payment methods and invoices). Notifications and security are wired to the same flow.

## Environment variables

Add to `.env.local`:

```bash
# Required for billing
STRIPE_SECRET_KEY=sk_test_...

# Optional: subscription checkout (create a Price in Stripe Dashboard first)
STRIPE_PRICE_ID=price_...

# Optional: webhook (for subscription updates; configure in Stripe Dashboard → Developers → Webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: for webhook to update profile on subscription events (use Supabase service role)
SUPABASE_SERVICE_ROLE_KEY=...
```

## Supabase

1. **profiles table**  
   Add column if it doesn’t exist:
   - `stripe_customer_id` (text, nullable)

2. **notification_preferences**  
   If you store preferences as JSON, include `billing_alerts: boolean` for billing/invoice notifications.

## Stripe Dashboard

1. **Customer Portal**  
   Configure at [Stripe → Settings → Billing → Customer portal](https://dashboard.stripe.com/settings/billing/portal) (e.g. payment method update, invoice history, cancel subscription).

2. **Webhook**  
   - URL: `https://your-domain.com/api/stripe/webhook`  
   - Events: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`, `customer.subscription.deleted`  
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

3. **Subscription (optional)**  
   Create a Product and Price, then set `STRIPE_PRICE_ID` to the Price ID. “Subscribe / Upgrade” in Settings will start Checkout.

## Where it’s connected

- **Settings → Billing & security**  
  “Manage billing & payment” opens the Stripe Customer Portal (payment method, invoices). “Subscribe / Upgrade” starts Checkout when `STRIPE_PRICE_ID` is set.

- **Settings → Notification preferences**  
  “Billing alerts” covers invoices, payment failed, and subscription updates (Stripe also sends customer emails by default).

- **Notifications page**  
  “Billing & security” card links to Settings for managing billing and billing-related notifications.

- **Security**  
  Payment data is handled by Stripe; users manage their card and invoices in the same portal.
