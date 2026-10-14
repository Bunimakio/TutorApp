/**
 * Datos de prueba: alumnos, clases y pagos de ejemplo para revisar el sistema
 * con varios alumnos sin cargar todo a mano.
 *
 * Todo lo que se crea lleva el prefijo `[DEMO] ` y se puede borrar de una vez
 * desde Ajustes → Datos de prueba (al borrar un alumno, sus clases se van en
 * cascada).
 */
import { supabase, db, getCurrentUserId } from './supabase';
import { addDays, format, startOfWeek } from 'date-fns';
import type { DayOfWeek } from '@/types';

export const DEMO_PREFIX = '[DEMO] ';

type DemoClassStatus = 'pending' | 'paid' | 'cancelled';

interface DemoClass {
  /** 0 = semana actual, -3 = hace tres semanas, 1 = la próxima semana */
  weekOffset: number;
  day: DayOfWeek;
  start: string;
  minutes: 30 | 60 | 90 | 120;
  status: DemoClassStatus;
  /** Índice dentro de DEMO_SUBJECTS (por defecto, la asignatura del alumno) */
  subject?: number;
  notes?: string;
}

interface DemoStudent {
  name: string;
  email: string | null;
  phone: string | null;
  notes: string;
  /** Índice dentro de DEMO_SUBJECTS */
  subject: number;
  classes: DemoClass[];
}

/** Se usan solo si la cuenta todavía no tiene asignaturas cargadas. */
const DEMO_SUBJECTS = [
  { name: 'Matemáticas', price: 25, color: '#3B82F6' },
  { name: 'Física', price: 30, color: '#8B5CF6' },
  { name: 'Lengua', price: 20, color: '#F59E0B' },
  { name: 'Apoyo escolar', price: 0, color: '#10B981' },
];

/**
 * Cada alumno representa una situación distinta para chequear el calendario y
 * la sección de pagos:
 *  - Ana: al día (todo pagado, incluso clases de hace más de 30 días).
 *  - Bruno: con deuda (clases pendientes, algunas viejas).
 *  - Carla: mixto, con una clase cancelada.
 *  - Diego: solo deuda antigua (esta semana no aparece en el calendario).
 *  - Elena: alumno nuevo, sin clases.
 *  - Franco: semana cargada y nombre largo.
 *  - Gabriela: clases sin precio (0 €/h), una de 30 minutos y una de la semana que viene.
 *
 * Las clases de un mismo día nunca se solapan (el calendario no permite dos
 * clases a la misma hora).
 */
const DEMO_STUDENTS: DemoStudent[] = [
  {
    name: 'Ana Gómez',
    email: 'ana.gomez@ejemplo.com',
    phone: '600 111 222',
    notes: 'Paga siempre a fin de mes.',
    subject: 0,
    classes: [
      { weekOffset: 0, day: 1, start: '09:00', minutes: 60, status: 'paid' },
      { weekOffset: 0, day: 3, start: '09:00', minutes: 60, status: 'paid' },
      { weekOffset: 0, day: 5, start: '17:00', minutes: 90, status: 'paid' },
      { weekOffset: -5, day: 2, start: '10:00', minutes: 60, status: 'paid' },
      { weekOffset: -7, day: 4, start: '16:00', minutes: 60, status: 'paid' },
    ],
  },
  {
    name: 'Bruno Díaz',
    email: 'bruno.diaz@ejemplo.com',
    phone: '601 333 444',
    notes: 'Debe las últimas clases.',
    subject: 1,
    classes: [
      { weekOffset: 0, day: 1, start: '10:30', minutes: 60, status: 'pending' },
      { weekOffset: 0, day: 2, start: '09:00', minutes: 90, status: 'pending' },
      { weekOffset: 0, day: 4, start: '18:00', minutes: 60, status: 'paid' },
      { weekOffset: -2, day: 3, start: '11:00', minutes: 60, status: 'pending' },
      { weekOffset: -3, day: 5, start: '09:30', minutes: 60, status: 'paid' },
    ],
  },
  {
    name: 'Carla Ruiz',
    email: 'carla.ruiz@ejemplo.com',
    phone: '602 555 666',
    notes: 'Una clase se canceló por enfermedad.',
    subject: 2,
    classes: [
      { weekOffset: 0, day: 2, start: '11:00', minutes: 60, status: 'paid' },
      { weekOffset: 0, day: 3, start: '15:00', minutes: 60, status: 'pending' },
      { weekOffset: 0, day: 6, start: '10:00', minutes: 90, status: 'cancelled', notes: 'Cancelada por la alumna' },
      { weekOffset: -1, day: 1, start: '09:00', minutes: 60, status: 'paid' },
    ],
  },
  {
    name: 'Diego Sosa',
    email: null,
    phone: '603 777 888',
    notes: 'Deuda vieja, sin clases esta semana.',
    subject: 0,
    classes: [
      { weekOffset: -4, day: 2, start: '15:00', minutes: 60, status: 'pending' },
      { weekOffset: -6, day: 4, start: '10:00', minutes: 60, status: 'pending' },
    ],
  },
  {
    name: 'Elena Vidal',
    email: 'elena.vidal@ejemplo.com',
    phone: null,
    notes: 'Recién anotada, todavía sin clases.',
    subject: 1,
    classes: [],
  },
  {
    name: 'Franco Lima de la Torre',
    email: 'franco.lima@ejemplo.com',
    phone: '603 111 999',
    notes: 'Semana cargada (nombre largo, para ver cómo ensancha el calendario).',
    subject: 1,
    classes: [
      { weekOffset: 0, day: 1, start: '12:00', minutes: 60, status: 'pending', subject: 3 },
      { weekOffset: 0, day: 1, start: '15:00', minutes: 120, status: 'paid' },
      { weekOffset: 0, day: 3, start: '12:00', minutes: 60, status: 'pending' },
      { weekOffset: 0, day: 4, start: '16:00', minutes: 60, status: 'pending' },
      { weekOffset: 0, day: 5, start: '10:00', minutes: 60, status: 'paid' },
      { weekOffset: 0, day: 6, start: '11:30', minutes: 60, status: 'pending' },
    ],
  },
  {
    name: 'Gabriela Pérez',
    email: 'gabriela.perez@ejemplo.com',
    phone: '605 222 111',
    notes: 'Clases de apoyo (sin precio) y una de media hora.',
    subject: 3,
    classes: [
      { weekOffset: 0, day: 2, start: '17:00', minutes: 60, status: 'paid' },
      { weekOffset: 0, day: 5, start: '19:00', minutes: 30, status: 'pending' },
      { weekOffset: 1, day: 1, start: '09:00', minutes: 60, status: 'pending', subject: 2 },
    ],
  },
];

/** Suma minutos a una hora "HH:MM". */
export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export interface DemoStudentRow {
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string;
}

export interface DemoClassRow {
  /** Índice dentro de buildDemoStudentRows() */
  studentIndex: number;
  subject_id: string;
  day_of_week: DayOfWeek;
  start_time: string;
  end_time: string;
  date: string;
  status: DemoClassStatus;
  notes: string | null;
}

/** Alumnos de ejemplo, ya con el prefijo [DEMO]. */
export function buildDemoStudentRows(): DemoStudentRow[] {
  return DEMO_STUDENTS.map(s => ({
    full_name: DEMO_PREFIX + s.name,
    email: s.email,
    phone: s.phone,
    notes: s.notes,
  }));
}

/**
 * Arma las clases de ejemplo para la semana que empieza en `monday`.
 * `subjectIds` va en el mismo orden que DEMO_SUBJECTS; si hay menos
 * asignaturas reales, se reutilizan.
 */
export function buildDemoClassRows(monday: Date, subjectIds: string[]): DemoClassRow[] {
  const subjectAt = (index: number) => subjectIds[index % subjectIds.length];
  const rows: DemoClassRow[] = [];

  DEMO_STUDENTS.forEach((student, studentIndex) => {
    for (const demoClass of student.classes) {
      const date = addDays(monday, demoClass.weekOffset * 7 + (demoClass.day - 1));
      rows.push({
        studentIndex,
        subject_id: subjectAt(demoClass.subject ?? student.subject),
        day_of_week: demoClass.day,
        start_time: demoClass.start,
        end_time: addMinutesToTime(demoClass.start, demoClass.minutes),
        date: format(date, 'yyyy-MM-dd'),
        status: demoClass.status,
        notes: demoClass.notes ?? null,
      });
    }
  });

  return rows;
}

export interface DemoSeedResult {
  students: number;
  classes: number;
  subjects: number;
}

/**
 * Crea los datos de prueba en la base (se guardan en la cuenta con la que
 * estás logueado).
 */
export async function loadDemoData(): Promise<DemoSeedResult> {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error('No hay sesión activa');

  // 1) Asignaturas: se usan las que ya tengas; si no hay ninguna, se crean.
  const { data: existingSubjects, error: subjectsErr } = await db.subjects.getAll();
  if (subjectsErr) throw subjectsErr;

  let subjectIds: string[] = (existingSubjects || []).map(s => s.id);
  let createdSubjects = 0;

  if (subjectIds.length === 0) {
    const { data: created, error } = await supabase
      .from('subjects')
      .insert(DEMO_SUBJECTS.map(s => ({ ...s, name: DEMO_PREFIX + s.name, user_id: userId })) as any)
      .select();
    if (error) throw error;
    subjectIds = (created || []).map((s: any) => s.id);
    createdSubjects = subjectIds.length;
  }

  // 2) Alumnos
  const studentRows = buildDemoStudentRows();
  const { data: createdStudents, error: studentsErr } = await supabase
    .from('students')
    .insert(studentRows.map(s => ({ ...s, user_id: userId })) as any)
    .select();
  if (studentsErr) throw studentsErr;

  // El servidor devuelve las filas creadas; las mapeamos por nombre para no
  // depender del orden.
  const studentsByName = new Map<string, string>();
  for (const s of createdStudents || []) studentsByName.set((s as any).full_name, (s as any).id);
  const studentIds = studentRows.map(s => studentsByName.get(s.full_name) || '').filter(Boolean);

  // 3) Clases
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const classRows = buildDemoClassRows(monday, subjectIds)
    .filter(row => studentIds[row.studentIndex])
    .map(row => ({
      user_id: userId,
      student_id: studentIds[row.studentIndex],
      subject_id: row.subject_id,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      date: row.date,
      status: row.status,
      notes: row.notes,
    }));

  if (classRows.length > 0) {
    const { error: classesErr } = await supabase.from('classes').insert(classRows as any);
    if (classesErr) throw classesErr;
  }

  return {
    students: studentIds.length,
    classes: classRows.length,
    subjects: createdSubjects,
  };
}

export interface DemoDeleteResult {
  students: number;
  subjects: number;
}

/**
 * Borra los datos de prueba. Las clases se eliminan en cascada con los alumnos;
 * las asignaturas [DEMO] solo se borran si no les quedan clases encima.
 */
export async function deleteDemoData(): Promise<DemoDeleteResult> {
  const { data: deletedStudents, error } = await supabase
    .from('students')
    .delete()
    .ilike('full_name', `${DEMO_PREFIX}%`)
    .select();
  if (error) throw error;

  const { data: demoSubjects } = await supabase
    .from('subjects')
    .select('id')
    .ilike('name', `${DEMO_PREFIX}%`);

  let deletedSubjects = 0;
  for (const subject of demoSubjects || []) {
    const { count } = await supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('subject_id', (subject as any).id);

    if (!count) {
      const { error: delErr } = await supabase.from('subjects').delete().eq('id', (subject as any).id);
      if (!delErr) deletedSubjects++;
    }
  }

  return {
    students: (deletedStudents || []).length,
    subjects: deletedSubjects,
  };
}
