-- Esquema de base de datos para Supabase (PostgreSQL)
-- Ejecuta esto en el SQL Editor de Supabase

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla de asignaturas
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de alumnos
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de clases
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 6), -- 1=Lunes, 6=Sábado
  start_time TIME NOT NULL, -- HH:MM:SS
  end_time TIME NOT NULL, -- HH:MM:SS
  date DATE NOT NULL, -- Fecha específica de la clase (YYYY-MM-DD)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de configuración de la app
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  slot_duration_minutes SMALLINT NOT NULL DEFAULT 30,
  week_start_day SMALLINT NOT NULL DEFAULT 1, -- 1=Lunes
  working_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5,6}', -- Lunes a Sábado
  working_hours_start TIME NOT NULL DEFAULT '08:00:00',
  working_hours_end TIME NOT NULL DEFAULT '22:00:00',
  default_subject_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_classes_user_date ON classes(user_id, date);
CREATE INDEX idx_classes_user_week ON classes(user_id, day_of_week, start_time);
CREATE INDEX idx_classes_student ON classes(student_id);
CREATE INDEX idx_classes_subject ON classes(subject_id);
CREATE INDEX idx_students_user ON students(user_id);
CREATE INDEX idx_subjects_user ON subjects(user_id);

-- RLS (Row Level Security) - Solo el usuario propietario puede ver/modificar sus datos
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para subjects
CREATE POLICY "Users can view own subjects" ON subjects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subjects" ON subjects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subjects" ON subjects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subjects" ON subjects
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para students
CREATE POLICY "Users can view own students" ON students
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own students" ON students
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own students" ON students
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own students" ON students
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para classes
CREATE POLICY "Users can view own classes" ON classes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own classes" ON classes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own classes" ON classes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own classes" ON classes
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para app_settings
CREATE POLICY "Users can view own settings" ON app_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" ON app_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" ON app_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para obtener estadísticas de un alumno
CREATE OR REPLACE FUNCTION get_student_stats(student_uuid UUID)
RETURNS TABLE (
  total_classes BIGINT,
  total_hours DECIMAL(10,2),
  classes_last_30_days BIGINT,
  paid_last_30_days DECIMAL(10,2),
  pending_amount DECIMAL(10,2),
  last_class_date DATE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_classes,
    COALESCE(SUM(EXTRACT(EPOCH FROM (c.end_time - c.start_time)) / 3600), 0)::DECIMAL(10,2) as total_hours,
    COUNT(*) FILTER (WHERE c.date >= CURRENT_DATE - INTERVAL '30 days')::BIGINT as classes_last_30_days,
    COALESCE(SUM(s.price * EXTRACT(EPOCH FROM (c.end_time - c.start_time)) / 3600) FILTER (WHERE c.status = 'paid' AND c.date >= CURRENT_DATE - INTERVAL '30 days'), 0)::DECIMAL(10,2) as paid_last_30_days,
    COALESCE(SUM(s.price * EXTRACT(EPOCH FROM (c.end_time - c.start_time)) / 3600) FILTER (WHERE c.status = 'pending'), 0)::DECIMAL(10,2) as pending_amount,
    MAX(c.date) as last_class_date
  FROM classes c
  JOIN subjects s ON c.subject_id = s.id
  WHERE c.student_id = student_uuid
    AND c.user_id = v_user_id
    AND c.status != 'cancelled';
END;
$$;

-- Función para crear configuración por defecto al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO app_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Datos de ejemplo para asignaturas (opcional, se crean por usuario)
-- INSERT INTO subjects (user_id, name, price, color) VALUES
--   (auth.uid(), 'Matemáticas', 25.00, '#3B82F6'),
--   (auth.uid(), 'Física', 30.00, '#EF4444'),
--   (auth.uid(), 'Química', 28.00, '#10B981'),
--   (auth.uid(), 'Inglés', 22.00, '#F59E0B');