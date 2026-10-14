// Casos de prueba del store de alumnos: el "Total abonado" que se muestra en la
// ficha del alumno (todas las clases pagadas, sin límite de 30 días).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getCurrentUserId: vi.fn(async () => 'user-1'),
  db: {
    students: {
      getAll: vi.fn(),
      getById: vi.fn(),
      getWithStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
    },
    classes: {
      getByStudent: vi.fn(),
      getPaidByStudent: vi.fn(),
      getAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    subjects: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock('@/lib/indexeddb', () => ({
  offlineStudents: {
    put: vi.fn(async () => {}),
    getAll: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    delete: vi.fn(async () => {}),
  },
  offlineClasses: {
    put: vi.fn(async () => {}),
    getAll: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    delete: vi.fn(async () => {}),
  },
  offlineSubjects: {
    put: vi.fn(async () => {}),
    getAll: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    delete: vi.fn(async () => {}),
  },
}));

vi.mock('@/lib/sync', () => ({
  syncService: {
    queueCreate: vi.fn(async () => {}),
    queueUpdate: vi.fn(async () => {}),
    queueDelete: vi.fn(async () => {}),
    checkOnline: vi.fn(async () => true),
    getPendingCount: vi.fn(async () => 0),
    syncAll: vi.fn(async () => {}),
  },
}));

import { db } from '@/lib/supabase';
import { useStudentsStore } from '@/stores/students';

const student = {
  id: 'st-1',
  full_name: 'Ana Gómez',
  email: 'ana@ejemplo.com',
  phone: null,
  notes: null,
  created_at: '',
  updated_at: '',
} as any;

function stats(overrides: Record<string, any> = {}): any {
  return {
    total_classes: 0,
    total_hours: 0,
    classes_last_30_days: 0,
    paid_last_30_days: 0,
    pending_amount: 0,
    last_class_date: null,
    ...overrides,
  };
}

/** Clases pagadas que devuelve el servidor (precio por hora de la asignatura). */
function paidClass(price: number, start: string, end: string) {
  return { start_time: start, end_time: end, subject: { price } };
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.mocked(db.students.getWithStats).mockResolvedValue({ data: [stats()], error: null } as any);
  vi.mocked(db.classes.getByStudent).mockResolvedValue({ data: [], error: null } as any);
  vi.mocked(db.classes.getPaidByStudent).mockResolvedValue({ data: [], error: null } as any);
});

describe('total abonado', () => {
  it('suma todas las clases pagadas, incluidas las de hace más de 30 días', async () => {
    vi.mocked(db.students.getWithStats).mockResolvedValue({
      data: [stats({ paid_last_30_days: 20 })],
      error: null,
    } as any);
    vi.mocked(db.classes.getPaidByStudent).mockResolvedValue({
      // 1h * 20 + 1,5h * 30 + 0,5h * 40 + 1h * 0 (sin precio) = 85
      data: [
        paidClass(20, '09:00:00', '10:00:00'),
        paidClass(30, '09:00:00', '10:30:00'),
        paidClass(40, '17:00:00', '17:30:00'),
        paidClass(0, '09:00:00', '10:00:00'),
      ],
      error: null,
    } as any);

    const store = useStudentsStore();
    store.students = [{ id: 'st-1', full_name: 'Ana Gómez' } as any];

    await store.fetchWithStats('st-1');

    expect(store.paidTotal).toBe(85);
    // El servidor solo informa los últimos 30 días; el total es más grande.
    expect(store.studentStats?.paid_last_30_days).toBe(20);
  });

  it('si no se puede calcular, usa el monto que informa el servidor', async () => {
    vi.mocked(db.students.getWithStats).mockResolvedValue({
      data: [stats({ paid_last_30_days: 150 })],
      error: null,
    } as any);
    vi.mocked(db.classes.getPaidByStudent).mockRejectedValue(new Error('sin conexión'));

    const store = useStudentsStore();
    store.students = [{ id: 'st-1', full_name: 'Ana Gómez' } as any];

    await store.fetchWithStats('st-1');

    expect(store.paidTotal).toBe(150);
  });

  it('toma el pendiente que informa el servidor (base del "Al día")', async () => {
    vi.mocked(db.students.getWithStats).mockResolvedValue({
      data: [stats({ pending_amount: 75 })],
      error: null,
    } as any);

    const store = useStudentsStore();
    store.students = [{ id: 'st-1', full_name: 'Ana Gómez' } as any];

    await store.fetchWithStats('st-1');

    expect(store.studentStats?.pending_amount).toBe(75);
  });

  it('vuelve a cero al deseleccionar el alumno', async () => {
    vi.mocked(db.classes.getPaidByStudent).mockResolvedValue({
      data: [paidClass(60, '09:00:00', '10:00:00')],
      error: null,
    } as any);

    const store = useStudentsStore();
    store.students = [{ id: 'st-1', full_name: 'Ana Gómez' } as any];

    await store.fetchWithStats('st-1');
    expect(store.paidTotal).toBe(60);

    store.clearSelection();
    expect(store.paidTotal).toBe(0);
  });
});
