// Cliente Supabase y tipos de base de datos

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Variables de entorno (se configurarán en .env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variables de entorno de Supabase no configuradas. Usa .env.local');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helpers de autenticación
export const auth = {
  // El mail de confirmación vuelve al login del dominio desde el que se registró.
  // Ese dominio debe estar autorizado en Supabase → Authentication → URL Configuration.
  signUp: (email: string, password: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    }),

  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  getUser: () => supabase.auth.getUser(),

  onAuthStateChange: (callback: (event: string, session: unknown) => void) =>
    supabase.auth.onAuthStateChange(callback),

  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    }),

  updatePassword: (password: string) =>
    supabase.auth.updateUser({ password }),
};

// Devuelve el id del usuario autenticado actual (o null).
// Se usa al crear filas para rellenar `user_id` de forma fiable,
// en lugar de "adivinar" el usuario con una consulta previa.
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Helpers de base de datos con tipado
export const db = {
  // Subjects
  subjects: {
    getAll: () =>
      supabase
        .from('subjects')
        .select('*')
        .order('name'),

    getById: (id: string) =>
      supabase
        .from('subjects')
        .select('*')
        .eq('id', id)
        .single(),

    create: (subject: Database['public']['Tables']['subjects']['Insert']) =>
      supabase
        .from('subjects')
        .insert(subject)
        .select()
        .single(),

    update: (id: string, subject: Database['public']['Tables']['subjects']['Update']) =>
      supabase
        .from('subjects')
        .update(subject)
        .eq('id', id)
        .select()
        .single(),

    delete: (id: string) =>
      supabase
        .from('subjects')
        .delete()
        .eq('id', id),
  },

  // Students
  students: {
    getAll: () =>
      supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false }),

    getById: (id: string) =>
      supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single(),

    getWithStats: (id: string) =>
      supabase.rpc('get_student_stats', { student_uuid: id }),

    search: (query: string) =>
      supabase
        .from('students')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .order('created_at', { ascending: false }),

    create: (student: Database['public']['Tables']['students']['Insert']) =>
      supabase
        .from('students')
        .insert(student)
        .select()
        .single(),

    update: (id: string, student: Database['public']['Tables']['students']['Update']) =>
      supabase
        .from('students')
        .update(student)
        .eq('id', id)
        .select()
        .single(),

    delete: (id: string) =>
      supabase
        .from('students')
        .delete()
        .eq('id', id),
  },

  // Classes
  classes: {
    getByWeek: (weekStart: string, weekEnd: string) =>
      supabase
        .from('classes')
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date')
        .order('start_time'),

    getByDate: (date: string) =>
      supabase
        .from('classes')
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .eq('date', date)
        .order('start_time'),

    getById: (id: string) =>
      supabase
        .from('classes')
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .eq('id', id)
        .single(),

    getByStudent: (studentId: string, limit = 5) =>
      supabase
        .from('classes')
        .select(`
          *,
          subject:subjects(*)
        `)
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(limit),

    // Últimos pagos: clases recientes con alumno y asignatura. No incluye las
    // canceladas (rechazadas). Los filtros se aplican en la consulta para que
    // sigan devolviendo las últimas 10 coincidencias.
    getRecent: (options: { limit?: number; studentId?: string; subjectId?: string; date?: string } = {}) => {
      let query = supabase
        .from('classes')
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .neq('status', 'cancelled');

      if (options.studentId) query = query.eq('student_id', options.studentId);
      if (options.subjectId) query = query.eq('subject_id', options.subjectId);
      if (options.date) query = query.eq('date', options.date);

      return query
        .order('date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(options.limit ?? 10);
    },

    // Clases de un mes (informe de pagos), ordenadas por fecha y hora.
    getByMonth: (start: string, end: string) =>
      supabase
        .from('classes')
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .neq('status', 'cancelled')
        .gte('date', start)
        .lte('date', end)
        .order('date')
        .order('start_time'),

    // Todas las clases pagadas de un alumno (para el total abonado histórico).
    getPaidByStudent: (studentId: string) =>
      supabase
        .from('classes')
        .select(`
          start_time,
          end_time,
          subject:subjects(price)
        `)
        .eq('student_id', studentId)
        .eq('status', 'paid'),

    checkConflict: (dayOfWeek: number, startTime: string, endTime: string, date: string, excludeId?: string) => {
      let query = supabase
        .from('classes')
        .select('id')
        .eq('day_of_week', dayOfWeek)
        .eq('date', date)
        .neq('status', 'cancelled')
        .lt('start_time', endTime)
        .gt('end_time', startTime);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      return query;
    },

    create: (classData: Database['public']['Tables']['classes']['Insert']) =>
      supabase
        .from('classes')
        .insert(classData)
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .single(),

    update: (id: string, classData: Database['public']['Tables']['classes']['Update']) =>
      supabase
        .from('classes')
        .update(classData)
        .eq('id', id)
        .select(`
          *,
          student:students(*),
          subject:subjects(*)
        `)
        .single(),

    updateStatus: (id: string, status: 'pending' | 'paid' | 'cancelled') =>
      supabase
        .from('classes')
        .update({ status })
        .eq('id', id)
        .select()
        .single(),

    delete: (id: string) =>
      supabase
        .from('classes')
        .delete()
        .eq('id', id),
  },

  // Realtime subscriptions
  subscribeToClasses: (callback: (payload: { new: Database['public']['Tables']['classes']['Row'] | null; old: Database['public']['Tables']['classes']['Row'] | null; eventType: string }) => void) =>
    supabase
      .channel('classes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classes',
        },
        callback
      )
      .subscribe(),

  subscribeToStudents: (callback: (payload: { new: Database['public']['Tables']['students']['Row'] | null; old: Database['public']['Tables']['students']['Row'] | null; eventType: string }) => void) =>
    supabase
      .channel('students_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'students',
        },
        callback
      )
      .subscribe(),

  subscribeToSubjects: (callback: (payload: { new: Database['public']['Tables']['subjects']['Row'] | null; old: Database['public']['Tables']['subjects']['Row'] | null; eventType: string }) => void) =>
    supabase
      .channel('subjects_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subjects',
        },
        callback
      )
      .subscribe(),
};