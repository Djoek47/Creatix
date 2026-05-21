-- One-time welcome email after first successful session in the app (see lib/email/send-welcome-email-if-needed.ts).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS welcome_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.welcome_email_sent_at IS
  'When the post-login welcome email was sent via Resend; null means not sent yet.';
