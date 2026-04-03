-- Commenter: post/story/stream comments, AI analysis, persona reply drafts, fan profile signals
-- Run after profiles, fan_thread_insights exist.

CREATE TABLE IF NOT EXISTS public.platform_post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'onlyfans',
  platform_post_id TEXT NOT NULL,
  platform_fan_id TEXT NOT NULL,
  fan_username TEXT,
  fan_display_name TEXT,
  platform_comment_id TEXT,
  idempotency_key TEXT NOT NULL,
  comment_text TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'post' CHECK (source IN ('post', 'story', 'stream')),
  raw_payload JSONB DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  external_created_at TIMESTAMPTZ,
  analysis_status TEXT NOT NULL DEFAULT 'pending' CHECK (analysis_status IN ('pending', 'done', 'failed', 'skipped')),
  creator_reply_text TEXT,
  creator_reply_at TIMESTAMPTZ,
  UNIQUE (idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_platform_post_comments_user_received
  ON public.platform_post_comments (user_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_post_comments_user_fan
  ON public.platform_post_comments (user_id, platform, platform_fan_id);
CREATE UNIQUE INDEX IF NOT EXISTS platform_post_comments_platform_comment_uidx
  ON public.platform_post_comments (user_id, platform, platform_comment_id)
  WHERE platform_comment_id IS NOT NULL AND platform_comment_id <> '';

ALTER TABLE public.platform_post_comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_post_comments_own" ON public.platform_post_comments;
CREATE POLICY "platform_post_comments_own" ON public.platform_post_comments
  FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.post_comment_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.platform_post_comments(id) ON DELETE CASCADE,
  analysis_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_analyses_comment ON public.post_comment_analyses (comment_id);

ALTER TABLE public.post_comment_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_comment_analyses_own" ON public.post_comment_analyses;
CREATE POLICY "post_comment_analyses_own" ON public.post_comment_analyses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.platform_post_comments c
      WHERE c.id = comment_id AND c.user_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS public.post_comment_reply_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL REFERENCES public.platform_post_comments(id) ON DELETE CASCADE,
  voice TEXT NOT NULL CHECK (voice IN ('circe', 'venus', 'flirt', 'professional', 'best')),
  suggestion_text TEXT NOT NULL DEFAULT '',
  is_ai_generated BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (comment_id, voice)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_reply_suggestions_comment
  ON public.post_comment_reply_suggestions (comment_id);

ALTER TABLE public.post_comment_reply_suggestions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_comment_reply_suggestions_own" ON public.post_comment_reply_suggestions;
CREATE POLICY "post_comment_reply_suggestions_own" ON public.post_comment_reply_suggestions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.platform_post_comments c
      WHERE c.id = comment_id AND c.user_id = auth.uid()
    )
  );

COMMENT ON TABLE public.platform_post_comments IS 'Ingested OnlyFans post/story/stream comments (webhook + optional API sync)';
COMMENT ON TABLE public.post_comment_analyses IS 'Latest AI analysis per comment (connotation, safety, CRM delta)';
COMMENT ON TABLE public.post_comment_reply_suggestions IS 'Per-persona public reply drafts; review-only, not auto-posted';
