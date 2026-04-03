-- Manual CRM classification override (complements AI/heuristic audience on the Fans page).
ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS audience_profile_override TEXT
    CHECK (
      audience_profile_override IS NULL
      OR audience_profile_override IN ('auto', 'whale', 'creator', 'fan')
    );

COMMENT ON COLUMN public.fans.audience_profile_override IS
  'CRM UI: auto = derive from spend + insights; whale = treat as whale/VIP; creator = force creator signal; fan = force typical fan (no creator signal).';
