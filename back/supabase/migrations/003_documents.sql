CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('pdf', 'excel', 'docx', 'txt', 'csv', 'json', 'md')),
    filename TEXT NOT NULL,
    parsed_content JSONB NOT NULL DEFAULT '{}'::jsonb,
    session_id UUID REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    embeddings JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_session_id ON documents(session_id);
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_content ON documents USING GIN (parsed_content);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_documents" ON documents
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "users_can_insert_own_documents" ON documents
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_documents" ON documents
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- RLS Policy: Users can only delete their own documents
CREATE POLICY "users_can_delete_own_documents" ON documents
    FOR DELETE
    USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER documents_update_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_documents_updated_at();
