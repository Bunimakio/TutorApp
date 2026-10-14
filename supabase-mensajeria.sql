-- ============================================================
-- Mensajería (Fase 1): correos manuales a los alumnos
-- Ejecuta esto en el SQL Editor de Supabase (Project → SQL Editor)
-- Es seguro volver a ejecutarlo: no borra datos.
-- ============================================================

-- 1) Cada alumno decide si quiere recibir correos (por defecto, sí).
--    Si un alumno pide no recibir, se excluye de los envíos automáticos
--    y aparece marcado al mandar un aviso manual.
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS notify_email BOOLEAN NOT NULL DEFAULT TRUE;

-- 2) Registro de los correos enviados (historial + control del límite diario).
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  -- 'manual' = lo envió el usuario a mano, 'reminder' = recordatorio automático
  kind TEXT NOT NULL DEFAULT 'manual' CHECK (kind IN ('manual', 'reminder')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'error')),
  error TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_user_sent ON messages(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_student ON messages(student_id);

-- 3) RLS: cada usuario solo ve y registra sus propios envíos.
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own messages" ON messages;
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON messages;
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);
