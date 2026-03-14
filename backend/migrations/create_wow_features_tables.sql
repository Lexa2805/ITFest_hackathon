-- Migration: Create tables for Daily Briefing & WOW Features
-- Tables: daily_briefings, chat_sessions, chat_messages, user_streaks

-- ============================================================
-- daily_briefings: Caches AI-generated briefings per user per day
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    narrative TEXT NOT NULL,
    data_snapshot JSONB NOT NULL,
    source TEXT NOT NULL DEFAULT 'gpt',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_briefings_user_date
    ON public.daily_briefings(user_id, date DESC);

COMMENT ON TABLE public.daily_briefings IS 'Caches AI-generated daily briefing narratives per user per calendar day';

-- ============================================================
-- chat_sessions: Conversational agent session tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.chat_sessions IS 'Tracks conversational nutrition agent sessions per user';

-- ============================================================
-- chat_messages: Individual messages within a chat session
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session
    ON public.chat_messages(session_id, created_at);

COMMENT ON TABLE public.chat_messages IS 'Stores individual messages within conversational agent sessions';

-- ============================================================
-- user_streaks: Persists computed streak data for fast reads
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('checkin', 'meal_logged', 'calorie_goal')),
    current_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_user_streaks_user
    ON public.user_streaks(user_id);

COMMENT ON TABLE public.user_streaks IS 'Persists streak counts for gamification (checkins, meals logged, calorie goal adherence)';
