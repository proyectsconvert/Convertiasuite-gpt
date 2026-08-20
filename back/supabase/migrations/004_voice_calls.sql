CREATE TABLE IF NOT EXISTS voice_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    started_at TIMESTAMPZ DEFAULT now() ended_at TIMESTAMPZ,
    duration_seconds INTEGER,
    title TEXT,
    status TEXT DEFAULT 'active'
)