// Casos de prueba del store de clases: creación, edición, y las reglas del pago
// confirmado (que es definitivo y no se puede deshacer).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getCurrentUserId: vi.fn(async () => 'user-1'),
  db: {
    classes: {
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      checkConflict: vi.fn(),
      getByStudent: vi.fn(),
      getPaidByStudent: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      getByWeek: vi.fn(),
    },
    students: {
      getAll: vi.fn(),
      getById: vi.fn(),
      getWithStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
    },
    subjects: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

vi.mock('@/lib/indexeddb', () => ({
  offlineClasses: {
    put: vi.fn(async () => {}),
    getAll: vi.fn(async () => []),
    getById: vi.fn(async () => null),
    getByDateRange: vi.fn(async () => []),
    delete: vi.fn(async () => {}),
  },
  offlineStudents: {
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
import { useClassesStore } from '@/stores/classes';
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

const statsRow = {
  total_classes: 0,
  total_hours: 0,
  classes_last_30_days: 0,
  paid_last_30_days: 0,
  pending_amount: 0,
  last_class_date: null,
};

function makeClass(overrides: Record<string, any> = {}): any {
  return {
    id: 'c-1',
    user_id: 'user-1',
    student_id: 'st-1',
    subject_id: 'su-1',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    date: '2026-10-12',
    status: 'pending',
    notes: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

/** Datos que manda el formulario al guardar. */
function formData(overrides: Record<string, any> = {}): any {
  return {
    student_name: 'Ana Gómez',
    student_email: 'ana@ejemplo.com',
    subject_id: 'su-1',
    day_of_week: 1,
    start_time: '09:00',
    duration_minutes: 60,
    date: '2026-10-12',
    notes: '',
    paid: false,
    ...overrides,
  };
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.mocked(db.classes.checkConflict).mockResolvedValue({ data: [], error: null } as any);
  vi.mocked(db.classes.create).mockResolvedValue({ data: makeClass(), error: null } as any);
  vi.mocked(db.classes.update).mockResolvedValue({ data: makeClass({ status: 'paid' }), error: null } as any);
  vi.mocked(db.classes.updateStatus).mockResolvedValue({ data: null, error: null } as any);
  vi.mocked(db.students.getAll).mockResolvedValue({ data: [student], error: null } as any);
  vi.mocked(db.students.getWithStats).mockResolvedValue({ data: [statsRow], error: null } as any);
  vi.mocked(db.classes.getByStudent).mockResolvedValue({ data: [], error: null } as any);
  vi.mocked(db.classes.getPaidByStudent).mockResolvedValue({ data: [], error: null } as any);
});

describe('crear clase', () => {
  it('la crea pendiente si no se marcó "Abonado"', async () => {
    const store = useClassesStore();
    useStudentsStore().students = [student];

    await store.create(formData({ paid: false }));

    const payload = vi.mocked(db.classes.create).mock.calls[0][0] as any;
    expect(payload.status).toBe('pending');
    expect(payload.end_time).toBe('10:00');
    expect(payload.user_id).toBe('user-1');
  });

  it('la crea pagada si se marcó "Abonado"', async () => {
    const store = useClassesStore();
    useStudentsStore().students = [student];

    await store.create(formData({ paid: true }));

    const payload = vi.mocked(db.classes.create).mock.calls[0][0] as any;
    expect(payload.status).toBe('paid');
  });
});

describe('editar clase', () => {
  it('manda solo columnas reales y convierte la duración en hora de fin', async () => {
    const store = useClassesStore();
    store.classes = [makeClass()];

    await store.update('c-1', formData({ duration_minutes: 90, notes: 'solo notas', paid: true }));

    const payload = vi.mocked(db.classes.update).mock.calls[0][1] as any;
    expect(payload).toEqual({
      subject_id: 'su-1',
      day_of_week: 1,
      start_time: '09:00',
      date: '2026-10-12',
      notes: 'solo notas',
      end_time: '10:30',
      status: 'paid',
    });
    // Estos campos del formulario no existen en la tabla `classes` y la API los rechaza.
    expect(payload).not.toHaveProperty('duration_minutes');
    expect(payload).not.toHaveProperty('student_name');
    expect(payload).not.toHaveProperty('student_email');
  });

  it('no deja modificar una clase ya abonada (ni el alumno ni los demás datos)', async () => {
    const store = useClassesStore();
    store.classes = [makeClass({ status: 'paid' })];

    const result = await store.update('c-1', formData({ student_name: 'Otro Alumno', paid: false }));

    expect(result).toBeNull();
    expect(db.classes.update).not.toHaveBeenCalled();
    expect(store.error).toBe('Una clase abonada no se puede modificar');
  });

  it('deja las clases canceladas como canceladas', async () => {
    const store = useClassesStore();
    store.classes = [makeClass({ status: 'cancelled' })];

    await store.update('c-1', formData({ paid: false }));

    const payload = vi.mocked(db.classes.update).mock.calls[0][1] as any;
    expect(payload).not.toHaveProperty('status');
  });

  it('actualiza las estadísticas del alumno al confirmar el pago', async () => {
    const store = useClassesStore();
    store.classes = [makeClass()];

    await store.update('c-1', formData({ paid: true }));

    expect(db.students.getWithStats).toHaveBeenCalledWith('st-1');
  });

  it('no refresca estadísticas si el pago no cambió', async () => {
    const store = useClassesStore();
    store.classes = [makeClass({ status: 'cancelled' })];

    await store.update('c-1', formData({ paid: false }));

    expect(db.students.getWithStats).not.toHaveBeenCalled();
  });
});

describe('pago confirmado (definitivo)', () => {
  it('permite marcar como pagada una clase pendiente', async () => {
    const store = useClassesStore();
    store.classes = [makeClass()];

    const ok = await store.updateStatus('c-1', 'paid');

    expect(ok).toBe(true);
    expect(db.classes.updateStatus).toHaveBeenCalledWith('c-1', 'paid');
  });

  it('no permite deshacer un pago confirmado', async () => {
    const store = useClassesStore();
    store.classes = [makeClass({ status: 'paid' })];

    const ok = await store.updateStatus('c-1', 'pending');

    expect(ok).toBe(false);
    expect(db.classes.updateStatus).not.toHaveBeenCalled();
    expect(store.error).toContain('no se puede deshacer');
  });
});

describe('conflictos de horario al editar', () => {
  it('no consulta conflictos si el horario no cambió', async () => {
    const store = useClassesStore();
    store.classes = [makeClass()];

    await store.update('c-1', formData({ notes: 'solo cambia la nota' }));

    expect(db.classes.checkConflict).not.toHaveBeenCalled();
  });

  it('valida el conflicto con la duración nueva', async () => {
    const store = useClassesStore();
    store.classes = [makeClass()];

    await store.update('c-1', formData({ duration_minutes: 120 }));

    expect(db.classes.checkConflict).toHaveBeenCalledWith(1, '09:00', '11:00', '2026-10-12', 'c-1');
  });

  it('no guarda si hay otra clase en ese horario', async () => {
    vi.mocked(db.classes.checkConflict).mockResolvedValue({ data: [{ id: 'otra' }], error: null } as any);
    const store = useClassesStore();
    store.classes = [makeClass()];

    const result = await store.update('c-1', formData({ duration_minutes: 120 }));

    expect(result).toBeNull();
    expect(db.classes.update).not.toHaveBeenCalled();
    expect(store.error).toBe('Ya existe una clase en ese horario');
  });
});
