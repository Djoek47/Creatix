-- Shared, non-personal best-practices library for competitor insights & creator education.
-- Rows are inserted by service role (cron) or staff; creators read active entries via RLS.

CREATE TABLE IF NOT EXISTS public.best_practice_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'chatting',
    'commenting',
    'dm_sales',
    'content_calendar',
    'pricing',
    'retention',
    'cross_platform',
    'growth',
    'other'
  )),
  headline TEXT NOT NULL,
  summary TEXT,
  body TEXT NOT NULL,
  source_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  provenance TEXT NOT NULL CHECK (provenance IN (
    'ai_cron',
    'community_synthesis',
    'manual_seed',
    'merged'
  )),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_best_practice_library_active_cat_created
  ON public.best_practice_library (is_active, category, created_at DESC);

COMMENT ON TABLE public.best_practice_library IS 'Anonymized creator strategies compiled from web + approved community tips; no PII.';

ALTER TABLE public.best_practice_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS best_practice_library_select_authenticated ON public.best_practice_library;

CREATE POLICY best_practice_library_select_authenticated ON public.best_practice_library
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Starter row so first deploys have library context before cron runs (safe to re-run once).
INSERT INTO public.best_practice_library (category, headline, summary, body, source_urls, provenance)
SELECT
  'chatting',
  'Warm openers without oversharing',
  'Short, personal acknowledgments before pitch.',
  'Open with a specific callback to what they said or tipped. One line of warmth, then a soft question or teaser — avoid walls of text before they invest.',
  '[]'::jsonb,
  'manual_seed'
WHERE NOT EXISTS (SELECT 1 FROM public.best_practice_library b WHERE b.provenance = 'manual_seed');
