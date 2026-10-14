// Casos de prueba de la sección Pagos: lista de los últimos pagos con sus
// filtros e informe mensual imprimible (encabezado y totales destacados).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() } },
  auth: { updatePassword: vi.fn(), signOut: vi.fn() },
  getCurrentUserId: vi.fn(async () => 'user-1'),
  db: {
    classes: {
      getRecent: vi.fn(async () => ({ data: [], error: null })),
      getByMonth: vi.fn(async () => ({ data: [], error: null })),
    },
    students: { getAll: vi.fn(async () => ({ data: [], error: null })) },
    subjects: { getAll: vi.fn(async () => ({ data: [], error: null })) },
  },
}));

vi.mock('@/lib/indexeddb', () => ({
  offlineClasses: { put: vi.fn(async () => {}), getAll: vi.fn(async () => []) },
  offlineStudents: { put: vi.fn(async () => {}), getAll: vi.fn(async () => []) },
  offlineSubjects: { put: vi.fn(async () => {}), getAll: vi.fn(async () => []) },
  offlineMeta: { put: vi.fn(async () => {}), get: vi.fn(async () => null) },
  initOfflineDB: vi.fn(async () => {}),
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
  startAutoSync: vi.fn(),
  stopAutoSync: vi.fn(),
}));

import { db } from '@/lib/supabase';
import { formatLongDate, monthLabel } from '@/lib/payments';
import { useAuthStore } from '@/stores/auth';
import { usePaymentsStore } from '@/stores/payments';
import PaymentsView from '@/views/PaymentsView.vue';

const students = [
  { id: 'st-1', full_name: 'Ana Gómez', email: null, phone: null, notes: null, created_at: '', updated_at: '' },
  { id: 'st-2', full_name: 'Bruno Díaz', email: null, phone: null, notes: null, created_at: '', updated_at: '' },
];

const subjects = [
  { id: 'su-1', name: 'Matemática', price: 20, color: '#ed7311', created_at: '', updated_at: '' },
];

// 3 clases en el mes: 2 pagadas (40 + 30) y 1 pendiente (40).
const classes = [
  {
    id: 'c-1', student_id: 'st-1', subject_id: 'su-1', day_of_week: 1,
    start_time: '09:00:00', end_time: '11:00:00', date: '2026-10-12', status: 'paid',
    student: { id: 'st-1', full_name: 'Ana Gómez' }, subject: { id: 'su-1', name: 'Matemática', price: 20 },
  },
  {
    id: 'c-2', student_id: 'st-2', subject_id: 'su-1', day_of_week: 6, start_time: '10:00:00', end_time: '12:00:00',
    date: '2026-10-11', status: 'pending',
    student: { id: 'st-2', full_name: 'Bruno Díaz' }, subject: { id: 'su-1', name: 'Matemática', price: 20 },
  },
  {
    id: 'c-3', student_id: 'st-1', subject_id: 'su-1', day_of_week: 5, start_time: '11:00:00', end_time: '12:30:00',
    date: '2026-10-10', status: 'paid',
    student: { id: 'st-1', full_name: 'Ana Gómez' }, subject: { id: 'su-1', name: 'Matemática', price: 20 },
  },
];

/** Normaliza los espacios "finos" que mete Intl en los montos. */
function clean(text: string): string {
  return text.replace(/[\u00a0\u202f]/g, ' ');
}

async function mountView() {
  const wrapper = mount(PaymentsView);
  await flushPromises();
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.mocked(db.students.getAll).mockResolvedValue({ data: students, error: null } as any);
  vi.mocked(db.subjects.getAll).mockResolvedValue({ data: subjects, error: null } as any);
  vi.mocked(db.classes.getRecent).mockResolvedValue({ data: classes, error: null } as any);
  vi.mocked(db.classes.getByMonth).mockResolvedValue({ data: classes, error: null } as any);

  // Mes fijo para que el informe sea determinista.
  usePaymentsStore().month = '2026-10';
  useAuthStore().user = { email: 'profe@ejemplo.com' } as any;
});

describe('últimos pagos', () => {
  it('pide las últimas 10 clases y deja afuera las canceladas', async () => {
    await mountView();

    expect(db.classes.getRecent).toHaveBeenCalledWith({
      limit: 10,
      studentId: undefined,
      subjectId: undefined,
      date: undefined,
    });
  });

  it('muestra fecha y hora, alumno, asignatura, monto y condición', async () => {
    const wrapper = await mountView();
    const text = clean(wrapper.text());

    expect(text).toContain('Fecha y hora');
    expect(text).toContain('12/10/2026');
    expect(text).toContain('09:00');
    expect(text).toContain('Ana Gómez');
    expect(text).toContain('Bruno Díaz');
    expect(text).toContain('Matemática');
    expect(text).toContain('40,00 €');
    expect(text).toContain('Pagado');
    expect(text).toContain('Pendiente');
  });

  it('no muestra pagos rechazados', async () => {
    const wrapper = await mountView();

    expect(wrapper.text()).not.toContain('Cancelada');
    expect(wrapper.text()).not.toContain('Rechazado');
  });

  it('filtra por alumno y se puede limpiar el filtro', async () => {
    const wrapper = await mountView();
    const studentsSelect = wrapper.findAll('select')[0];

    await studentsSelect.setValue('st-1');
    await flushPromises();

    expect(db.classes.getRecent).toHaveBeenLastCalledWith(
      expect.objectContaining({ studentId: 'st-1' })
    );

    const clear = wrapper.findAll('button').find(b => b.text().includes('Limpiar filtros'));
    expect(clear).toBeTruthy();
    await clear!.trigger('click');
    await flushPromises();

    expect(db.classes.getRecent).toHaveBeenLastCalledWith(
      expect.objectContaining({ studentId: undefined })
    );
  });
});

describe('informe del mes', () => {
  it('pide las clases del mes y las ordena por fecha (día 1 al último)', async () => {
    await mountView();

    expect(db.classes.getByMonth).toHaveBeenCalledWith('2026-10-01', '2026-10-31');
  });

  it('tiene una hoja con el nombre de la app, el usuario, la fecha y el período', async () => {
    useAuthStore().user = { email: 'profe@ejemplo.com' } as any;
    const wrapper = await mountView();
    const report = clean(wrapper.find('.print-report').text());

    expect(report).toContain('TutorApp');
    expect(report).toContain('Informe de pagos');
    expect(report).toContain(monthLabel('2026-10'));
    expect(report).toContain(formatLongDate());
    expect(report).toContain('profe@ejemplo.com');
  });

  it('lista todas las clases del mes', async () => {
    const wrapper = await mountView();
    const report = clean(wrapper.find('.print-report').text());

    expect(report).toContain('12/10/2026');
    expect(report).toContain('11/10/2026');
    expect(report).toContain('10/10/2026');
    expect(report).toContain('Ana Gómez');
    expect(report).toContain('Bruno Díaz');
  });

  it('destaca el total ganado, las horas y la cantidad de clases', async () => {
    const wrapper = await mountView();
    const summary = clean(wrapper.find('.print-report section').text()).replace(/\s+/g, ' ');

    expect(summary).toMatch(/Total ganado \(cobrado\) *70,00 €/);
    expect(summary).toMatch(/Pendiente de cobro *40,00 €/);
    expect(summary).toMatch(/Horas dictadas *5,5 h/);
    expect(summary).toMatch(/Clases dictadas *3/);
    expect(summary).toMatch(/Total del mes \(cobrado \+ pendiente\): *110,00 €/);
  });

  it('imprime al tocar el botón', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const wrapper = await mountView();

    const button = wrapper.findAll('button').find(b => b.text().includes('Imprimir'));
    expect(button).toBeTruthy();
    await button!.trigger('click');

    expect(print).toHaveBeenCalledTimes(1);
    print.mockRestore();
  });
});
