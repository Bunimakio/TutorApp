// Casos de prueba del cargador de datos de prueba: qué se guarda y qué se borra.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { format, startOfWeek } from 'date-fns';

// Cliente de Supabase simulado: guarda lo que se inserta/borra y responde como
// lo haría la API (filas creadas, conteos, etc.).
const hoisted = vi.hoisted(() => {
  const state: any = {
    subjects: [] as any[],
    inserted: { subjects: [] as any[], students: [] as any[], classes: [] as any[] },
    deletedTables: [] as string[],
    subjectClasses: 0,
    filters: [] as string[],
  };

  function result(table: string, mode: string): any {
    if (mode === 'insert') {
      if (table === 'students') {
        return {
          data: state.inserted.students.map((s: any, i: number) => ({ id: `st-${i}`, full_name: s.full_name })),
          error: null,
        };
      }
      if (table === 'subjects') {
        return { data: state.inserted.subjects.map((_s: any, i: number) => ({ id: `su-${i}` })), error: null };
      }
      return { data: null, error: null };
    }

    if (mode === 'delete') {
      state.deletedTables.push(table);
      if (table === 'students') return { data: [{ id: 'st-0' }, { id: 'st-1' }], error: null };
      return { data: null, error: null };
    }

    if (table === 'subjects') return { data: [{ id: 'su-demo-0' }], error: null };
    if (table === 'classes') return { data: null, error: null, count: state.subjectClasses };
    return { data: null, error: null };
  }

  function makeQuery(table: string): any {
    let mode = 'select';
    const query: any = {
      insert: (rows: any) => { mode = 'insert'; state.inserted[table] = rows; return query; },
      delete: () => { mode = 'delete'; return query; },
      select: () => query,
      eq: () => query,
      ilike: (column: string, pattern: string) => { state.filters.push(`${column}=${pattern}`); return query; },
      then: (resolve: any) => resolve(result(table, mode)),
    };
    return query;
  }

  return { state, makeQuery };
});

vi.mock('@/lib/supabase', () => ({
  getCurrentUserId: async () => 'user-1',
  supabase: { from: (table: string) => hoisted.makeQuery(table) },
  db: { subjects: { getAll: async () => ({ data: hoisted.state.subjects, error: null }) } },
}));

import { loadDemoData, deleteDemoData } from '@/lib/demo';

const state = hoisted.state;

beforeEach(() => {
  state.subjects = [{ id: 'su-real' }];
  state.inserted = { subjects: [], students: [], classes: [] };
  state.deletedTables = [];
  state.subjectClasses = 0;
  state.filters = [];
});

describe('cargar datos de prueba', () => {
  it('crea los alumnos con el prefijo [DEMO] y su usuario', async () => {
    const result = await loadDemoData();

    expect(result.students).toBe(7);
    expect(state.inserted.students.length).toBe(7);
    expect(state.inserted.students.every((s: any) => s.full_name.startsWith('[DEMO] '))).toBe(true);
    expect(state.inserted.students.every((s: any) => s.user_id === 'user-1')).toBe(true);
  });

  it('arma las clases sobre los alumnos creados y las asignaturas que ya existen', async () => {
    const result = await loadDemoData();
    const clases = state.inserted.classes;

    expect(result.classes).toBe(clases.length);
    expect(result.classes).toBeGreaterThan(15);

    // Todas las clases cuelgan de un alumno creado y de la asignatura real.
    expect(clases.every((c: any) => c.student_id.startsWith('st-') && c.subject_id === 'su-real')).toBe(true);

    // Con pagos confirmados, pendientes y canceladas
    const statuses = new Set(clases.map((c: any) => c.status));
    expect(statuses).toEqual(new Set(['paid', 'pending', 'cancelled']));

    // Hay clases en la semana actual (para que se vea el calendario lleno)
    const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    expect(clases.some((c: any) => c.date === monday)).toBe(true);
  });

  it('crea asignaturas de ejemplo solo si la cuenta no tiene ninguna', async () => {
    state.subjects = [];

    const result = await loadDemoData();

    expect(result.subjects).toBe(4);
    expect(state.inserted.subjects.length).toBe(4);
    expect(state.inserted.subjects.every((s: any) => s.name.startsWith('[DEMO] '))).toBe(true);
    // Las clases usan las asignaturas recién creadas
    expect(state.inserted.classes.every((c: any) => c.subject_id.startsWith('su-'))).toBe(true);
  });
});

describe('borrar datos de prueba', () => {
  it('borra solo los alumnos [DEMO] y las asignaturas de ejemplo sin clases', async () => {
    const result = await deleteDemoData();

    expect(state.filters).toContain('full_name=[DEMO] %');
    expect(state.filters).toContain('name=[DEMO] %');
    expect(state.deletedTables).toContain('students');
    expect(state.deletedTables).toContain('subjects');
    expect(result.students).toBe(2);
    expect(result.subjects).toBe(1);
  });

  it('no borra una asignatura de ejemplo que tenga clases encima', async () => {
    state.subjectClasses = 3;

    const result = await deleteDemoData();

    expect(result.subjects).toBe(0);
    expect(state.deletedTables).not.toContain('subjects');
  });
});
