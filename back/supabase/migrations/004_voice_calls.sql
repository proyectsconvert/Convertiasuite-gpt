CREATE TABLE IF NOT EXISTS voice_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    title TEXT,
    status TEXT DEFAULT 'active'
);

ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own voice calls"
ON voice_calls FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own voice calls"
ON voice_calls FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own voice calls"
ON voice_calls FOR UPDATE
USING (auth.uid() = user_id);