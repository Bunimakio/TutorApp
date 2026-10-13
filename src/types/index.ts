// Tipos principales de la aplicación

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6; // Lunes=1 ... Sábado=6

export interface TimeSlot {
  hour: number; // 0-23
  minute: 0 | 30;
}

export interface Subject {
  id: string;
  name: string;
  price: number; // precio por hora
  color: string; // hex color para el calendario
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Campos computados (no en BD)
  total_classes?: number;
  total_hours?: number;
  last_class_date?: string | null;
  classes_last_month?: number;
  paid_last_month?: number;
}

export interface ClassSession {
  id: string;
  student_id: string;
  subject_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  date: string; // YYYY-MM-DD (fecha específica de la clase)
  status: 'pending' | 'paid' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones (populated)
  student?: Student;
  subject?: Subject;
}

export interface ClassFormData {
  student_name: string;
  student_email: string;
  subject_id: string;
  day_of_week: DayOfWeek;
  start_time: string; // HH:MM
  duration_minutes: 30 | 60 | 90 | 120;
  date: string; // YYYY-MM-DD
  notes?: string;
}

export interface StudentStats {
  student_id: string;
  total_classes: number;
  total_hours: number;
  classes_last_30_days: number;
  paid_last_30_days: number;
  pending_amount: number;
  last_class_date: string | null;
  recent_classes: ClassSession[]; // últimas 5
}

export interface WeekRange {
  start: Date; // Lunes
  end: Date; // Domingo
}

// Configuración de la app
export interface AppSettings {
  id: string;
  user_id: string;
  slot_duration_minutes: 30; // fijo en 30
  week_start_day: 1; // Lunes
  working_days: DayOfWeek[]; // [1,2,3,4,5,6]
  working_hours_start: string; // HH:MM
  working_hours_end: string; // HH:MM
  default_subject_price: number;
}

// Para el calendario
export interface CalendarCell {
  day: DayOfWeek;
  time: string; // HH:MM
  date: string; // YYYY-MM-DD (fecha real de la columna)
  class?: ClassSession;
  isCurrentTime: boolean;
  isPast: boolean;
}

// Filtros y búsqueda
export interface StudentFilters {
  search: string;
  sortBy: 'last_class' | 'name' | 'total_classes' | 'total_hours';
  sortOrder: 'asc' | 'desc';
}

// Sync status para offline
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error';

export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'class' | 'student' | 'subject';
  data: Record<string, unknown>;
  timestamp: number;
  retries: number;
}