-- Phase 1 i18n: persisted UI locale, date format, currency, and related toggles.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ui_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.ui_preferences IS
  'Client UI preferences: locale (en|es|pt|fr), dateFormat, currency, optional toggles.';
