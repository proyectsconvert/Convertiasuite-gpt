
-- ROW LEVEL SECURITY

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences      ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_attachments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking        ENABLE ROW LEVEL SECURITY;

-- FIX 7: tablas de referencia — RLS explícito (lectura pública autenticada)
ALTER TABLE roles                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE models                ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_access_policies ENABLE ROW LEVEL SECURITY;

-- POLICIES: PROFILES


CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = user_id);

-- FIX 6: admin puede ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (is_admin());

-- POLICIES: USER PREFERENCES

CREATE POLICY "Users can view own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id);


-- POLICIES: EMPLOYEE PROFILES
-- FIX 2: UPDATE restringido — el usuario solo puede tocar
-- campos operativos (phone_number). role_id, position_id,
-- department_id, supervisor_id solo los modifica el backend
-- con service_role key, nunca el cliente directamente.

CREATE POLICY "Users can view own employee profile"
ON employee_profiles FOR SELECT
USING (auth.uid() = user_id);

-- FIX 2: política de UPDATE eliminada para usuarios normales.
-- Las modificaciones de rol/posición/depto van por función
-- SECURITY DEFINER en el backend con validación de negocio.

CREATE POLICY "Admins can view all employee profiles"
ON employee_profiles FOR SELECT
USING (is_admin());

CREATE POLICY "Admins can update employee profiles"
ON employee_profiles FOR UPDATE
USING (is_admin());

CREATE POLICY "Users can view own active chat sessions"
ON chat_sessions FOR SELECT
USING (
    auth.uid() = user_id
    AND deleted_at IS NULL  -- FIX 1
);

CREATE POLICY "Users can create own chat sessions"
ON chat_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
ON chat_sessions FOR UPDATE
USING (
    auth.uid() = user_id
    AND deleted_at IS NULL  -- FIX 1: no actualizar sesiones ya borradas
);

CREATE POLICY "Users can delete own chat sessions"
ON chat_sessions FOR DELETE
USING (auth.uid() = user_id);


CREATE POLICY "Users can view own chat messages"
ON chat_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.session_id = chat_messages.session_id
          AND cs.user_id    = auth.uid()
          AND cs.deleted_at IS NULL
    )
);

CREATE POLICY "Users can insert own chat messages"
ON chat_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.session_id = chat_messages.session_id
          AND cs.user_id    = auth.uid()
          AND cs.deleted_at IS NULL
    )
);

CREATE POLICY "Users can update own chat messages"
ON chat_messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.session_id = chat_messages.session_id
          AND cs.user_id    = auth.uid()
          AND cs.deleted_at IS NULL
    )
);

CREATE POLICY "Users can delete own chat messages"
ON chat_messages FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM chat_sessions cs
        WHERE cs.session_id = chat_messages.session_id
          AND cs.user_id    = auth.uid()
    )
);