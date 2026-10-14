// Casos de prueba de las consultas de la sección Pagos.
// Se reemplaza el cliente de Supabase por uno falso que anota las llamadas, así
// se verifica que las últimas 10 clases excluyan las canceladas (rechazadas) y
// que el informe pida el mes completo.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { calls, makeBuilder } = vi.hoisted(() => {
  const calls: Array<{ method: string; args: any[] }> = [];

  function makeBuilder(result: unknown) {
    const builder: any = {};
    for (const method of ['select', 'neq', 'eq', 'gte', 'lte', 'order', 'limit']) {
      builder[method] = (...args: any[]) => {
        calls.push({ method, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
    return builder;
  }

  return { calls, makeBuilder };
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] });
      return makeBuilder({ data: [], error: null });
    },
    auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() },
  }),
}));

import { db } from '@/lib/supabase';

function callsOf(method: string): any[][] {
  return calls.filter(c => c.method === method).map(c => c.args);
}

beforeEach(() => {
  calls.length = 0;
});

describe('últimos pagos', () => {
  it('trae las últimas 10 clases y deja afuera las canceladas', async () => {
    await db.classes.getRecent();

    expect(callsOf('from')).toEqual([['classes']]);
    expect(callsOf('neq')).toEqual([['status', 'cancelled']]);
    expect(callsOf('eq')).toEqual([]);
    expect(callsOf('limit')).toEqual([[10]]);
  });

  it('ordena de la más reciente a la más antigua', async () => {
    await db.classes.getRecent();

    expect(callsOf('order')).toEqual([
      ['date', { ascending: false }],
      ['start_time', { ascending: false }],
    ]);
  });

  it('aplica los filtros de alumno, asignatura y fecha', async () => {
    await db.classes.getRecent({
      limit: 5,
      studentId: 'st-1',
      subjectId: 'su-2',
      date: '2026-10-12',
    });

    expect(callsOf('eq')).toEqual([
      ['student_id', 'st-1'],
      ['subject_id', 'su-2'],
      ['date', '2026-10-12'],
    ]);
    expect(callsOf('limit')).toEqual([[5]]);
  });
});

describe('informe del mes', () => {
  it('pide las clases del mes ordenadas por fecha y hora, sin canceladas', async () => {
    await db.classes.getByMonth('2024-02-01', '2024-02-29');

    expect(callsOf('from')).toEqual([['classes']]);
    expect(callsOf('neq')).toEqual([['status', 'cancelled']]);
    expect(callsOf('gte')).toEqual([['date', '2024-02-01']]);
    expect(callsOf('lte')).toEqual([['date', '2024-02-29']]);
    expect(callsOf('order')).toEqual([['date'], ['start_time']]);
    expect(callsOf('limit')).toEqual([]);
  });
});
