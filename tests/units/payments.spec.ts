// Casos de prueba de los cálculos de pagos y del store de la sección Pagos:
// duración/monto de una clase, rango del mes (febrero y año bisiesto) y el
// resumen del informe (cobrado, pendiente, horas y clases).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getCurrentUserId: vi.fn(async () => 'user-1'),
  db: {
    classes: {
      getRecent: vi.fn(),
      getByMonth: vi.fn(),
    },
  },
}));

import { db } from '@/lib/supabase';
import {
  classAmount,
  classHours,
  currentMonthValue,
  formatCurrency,
  formatDate,
  formatHours,
  monthLabel,
  monthRange,
  timeToMinutes,
} from '@/lib/payments';
import { usePaymentsStore } from '@/stores/payments';

function makeClass(overrides: Record<string, any> = {}): any {
  return {
    id: 'c-1',
    student_id: 'st-1',
    subject_id: 'su-1',
    start_time: '09:00:00',
    end_time: '10:00:00',
    date: '2026-10-12',
    status: 'paid',
    subject: { price: 20 },
    ...overrides,
  };
}

describe('cálculos de una clase', () => {
  it('convierte la hora a minutos (acepta segundos de la base)', () => {
    expect(timeToMinutes('09:30')).toBe(570);
    expect(timeToMinutes('09:30:00')).toBe(570);
    expect(timeToMinutes('')).toBe(0);
  });

  it('calcula la duración en horas', () => {
    expect(classHours(makeClass())).toBe(1);
    expect(classHours(makeClass({ end_time: '10:30' }))).toBe(1.5);
    expect(classHours(makeClass({ end_time: '09:30' }))).toBe(0.5);
  });

  it('nunca devuelve horas negativas', () => {
    expect(classHours(makeClass({ start_time: '10:00', end_time: '09:00' }))).toBe(0);
  });

  it('calcula el monto con el precio por hora de la asignatura', () => {
    expect(classAmount(makeClass({ end_time: '10:30' }))).toBe(30);
  });

  it('deja el monto en 0 si la asignatura no tiene precio', () => {
    expect(classAmount(makeClass({ subject: { price: 0 } }))).toBe(0);
    expect(classAmount(makeClass({ subject: null }))).toBe(0);
  });
});

describe('formatos', () => {
  it('muestra el dinero y las horas en formato español', () => {
    expect(formatCurrency(12345.5)).toContain('12.345,50');
    expect(formatCurrency(37.5)).toContain('37,50');
    expect(formatHours(2)).toBe('2');
    expect(formatHours(1.5)).toBe('1,5');
  });

  it('muestra la fecha como dd/mm/aaaa', () => {
    expect(formatDate('2026-10-12')).toBe('12/10/2026');
    expect(formatDate(null)).toBe('—');
  });

  it('nombra el mes en castellano', () => {
    expect(monthLabel('2026-10')).toContain('octubre');
    expect(monthLabel('2026-10')).toContain('2026');
  });
});

describe('rango del mes (fin de mes y año bisiesto)', () => {
  it('cubre el mes completo', () => {
    expect(monthRange('2026-10')).toMatchObject({ start: '2026-10-01', end: '2026-10-31' });
    expect(monthRange('2026-01')).toMatchObject({ start: '2026-01-01', end: '2026-01-31' });
    expect(monthRange('2026-12')).toMatchObject({ start: '2026-12-01', end: '2026-12-31' });
  });

  it('usa el 28 de febrero en un año normal', () => {
    expect(monthRange('2026-02')).toMatchObject({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('usa el 29 de febrero en un año bisiesto', () => {
    expect(monthRange('2024-02')).toMatchObject({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('cae en el mes actual si el valor es inválido', () => {
    expect(monthRange('').start).toBe(`${currentMonthValue()}-01`);
  });
});

describe('store de pagos', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(db.classes.getRecent).mockResolvedValue({ data: [], error: null } as any);
    vi.mocked(db.classes.getByMonth).mockResolvedValue({ data: [], error: null } as any);
  });

  it('pide los últimos 10 pagos cuando no hay filtros', async () => {
    const store = usePaymentsStore();

    await store.fetchRecent();

    expect(db.classes.getRecent).toHaveBeenCalledWith({
      limit: 10,
      studentId: undefined,
      subjectId: undefined,
      date: undefined,
    });
  });

  it('manda a la consulta los filtros elegidos', async () => {
    const store = usePaymentsStore();
    store.filters.studentId = 'st-1';
    store.filters.subjectId = 'su-2';
    store.filters.date = '2026-10-12';

    await store.fetchRecent();

    expect(db.classes.getRecent).toHaveBeenCalledWith({
      limit: 10,
      studentId: 'st-1',
      subjectId: 'su-2',
      date: '2026-10-12',
    });
  });

  it('guarda en la lista los pagos recibidos', async () => {
    vi.mocked(db.classes.getRecent).mockResolvedValue({ data: [makeClass()], error: null } as any);
    const store = usePaymentsStore();

    await store.fetchRecent();

    expect(store.recent).toHaveLength(1);
    expect(store.recent[0].id).toBe('c-1');
  });

  it('avisa si no se pudieron cargar los pagos', async () => {
    vi.mocked(db.classes.getRecent).mockResolvedValue({ data: null, error: new Error('sin conexión') } as any);
    const store = usePaymentsStore();

    await store.fetchRecent();

    expect(store.recent).toEqual([]);
    expect(store.error).toBe('sin conexión');
  });

  it('pide el mes completo, del día 1 al último', async () => {
    const store = usePaymentsStore();
    store.month = '2026-02';

    await store.fetchMonth();

    expect(db.classes.getByMonth).toHaveBeenCalledWith('2026-02-01', '2026-02-28');
  });

  it('en año bisiesto llega hasta el 29 de febrero', async () => {
    const store = usePaymentsStore();
    store.month = '2024-02';

    await store.fetchMonth();

    expect(db.classes.getByMonth).toHaveBeenCalledWith('2024-02-01', '2024-02-29');
  });

  it('resume el mes: cobrado, pendiente, total, horas y clases', async () => {
    vi.mocked(db.classes.getByMonth).mockResolvedValue({
      data: [
        makeClass({ id: 'c-1', status: 'paid', start_time: '09:00', end_time: '10:00' }),
        makeClass({ id: 'c-2', status: 'pending', start_time: '10:00', end_time: '11:30' }),
      ],
      error: null,
    } as any);
    const store = usePaymentsStore();

    await store.fetchMonth();

    expect(store.monthSummary).toEqual({ paid: 20, pending: 30, total: 50, hours: 2.5, classes: 2 });
  });

  it('marca si hay filtros activos y los limpia', async () => {
    const store = usePaymentsStore();
    expect(store.hasFilters).toBe(false);

    store.filters.studentId = 'st-1';
    expect(store.hasFilters).toBe(true);

    store.clearFilters();
    expect(store.hasFilters).toBe(false);
    expect(store.filters).toEqual({ studentId: '', subjectId: '', date: '' });
  });
});
