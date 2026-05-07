

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; 


CREATE TABLE IF NOT EXISTS profiles (
    user_id    UUID PRIMARY KEY
                   REFERENCES auth.users(id)
                   ON DELETE CASCADE,

    full_name  TEXT,
    avatar_url TEXT,
    bio        TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);



CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY
                REFERENCES auth.users(id)
                ON DELETE CASCADE,

    preferred_name       TEXT,
    custom_instructions  TEXT,

    preferred_model      TEXT DEFAULT 'qwen2.5:7b',

    theme    TEXT DEFAULT 'dark',
    language TEXT DEFAULT 'es',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);



CREATE TABLE IF NOT EXISTS roles (
    role_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name TEXT UNIQUE NOT NULL
);



CREATE TABLE IF NOT EXISTS departments (
    department_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_name TEXT UNIQUE NOT NULL,
    description     TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS positions (
    position_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    department_id UUID
        REFERENCES departments(department_id)
        ON DELETE SET NULL,

    position_name TEXT NOT NULL
);



CREATE TABLE IF NOT EXISTS employee_profiles (
    user_id UUID PRIMARY KEY
                REFERENCES auth.users(id)
                ON DELETE CASCADE,

    role_id UUID
        REFERENCES roles(role_id)
        ON DELETE SET NULL,

    position_id UUID
        REFERENCES positions(position_id)
        ON DELETE SET NULL,

    department_id UUID
        REFERENCES departments(department_id)
        ON DELETE SET NULL,

    supervisor_id UUID
        REFERENCES employee_profiles(user_id)
        ON DELETE SET NULL,

    employee_code TEXT UNIQUE,
    work_email    TEXT UNIQUE,
    phone_number  TEXT,

    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'suspended')),

    hired_at   TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);



CREATE TABLE IF NOT EXISTS models (
    model_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    provider      TEXT NOT NULL,
    model_name    TEXT UNIQUE NOT NULL,

    context_window INTEGER,
    input_cost     NUMERIC(10,6),
    output_cost    NUMERIC(10,6),

    active     BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_access_policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    role_id UUID
        REFERENCES roles(role_id)
        ON DELETE CASCADE,

    department_id UUID
        REFERENCES departments(department_id)
        ON DELETE CASCADE,

    model_id UUID NOT NULL
        REFERENCES models(model_id)
        ON DELETE CASCADE,

    max_requests_per_day INTEGER DEFAULT 100,
    priority_level       INTEGER DEFAULT 1,
    enabled              BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT uq_policy_role_department_model
        UNIQUE NULLS NOT DISTINCT (role_id, department_id, model_id)
);



CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    title       TEXT DEFAULT 'New Chat',
    description TEXT,

    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);



CREATE TABLE IF NOT EXISTS chat_messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID NOT NULL
        REFERENCES chat_sessions(session_id)
        ON DELETE CASCADE,

    role TEXT NOT NULL
        CHECK (role IN ('user', 'assistant', 'system')),

    content    TEXT NOT NULL,
    model_used TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);



CREATE TABLE IF NOT EXISTS chat_attachments (
    attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    message_id UUID NOT NULL
        REFERENCES chat_messages(message_id)
        ON DELETE CASCADE,

    storage_path   TEXT NOT NULL,
    file_name      TEXT NOT NULL,
    mime_type      TEXT,
    file_size      BIGINT,
    extracted_text TEXT,

    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES auth.users(id)
        ON DELETE SET NULL,

    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   UUID,

    metadata   JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);


CREATE TABLE IF NOT EXISTS usage_tracking (
    usage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES auth.users(id)
        ON DELETE CASCADE,

    model_id UUID NOT NULL
        REFERENCES models(model_id)
        ON DELETE CASCADE,

    request_count  INTEGER      DEFAULT 1,
    tokens_input   INTEGER      DEFAULT 0,
    tokens_output  INTEGER      DEFAULT 0,
    total_cost     NUMERIC(10,6) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now()
);



CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
    ON chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_active
    ON chat_sessions(user_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
    ON chat_messages(session_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
    ON chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id
    ON usage_tracking(user_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_model_id
    ON usage_tracking(model_id);

CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_created
    ON usage_tracking(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
    ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_map_role_model
    ON model_access_policies(role_id, model_id)
    WHERE enabled = true;



CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_employee_profiles_updated_at
    BEFORE UPDATE ON employee_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_chat_sessions_updated_at
    BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1
        FROM employee_profiles ep
        JOIN roles r ON r.role_id = ep.role_id
        WHERE ep.user_id = auth.uid()
          AND r.role_name = 'admin'
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

