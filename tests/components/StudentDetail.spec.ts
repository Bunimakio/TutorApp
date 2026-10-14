// Casos de prueba de la ficha del alumno: estado de pagos ("Al día" / pendiente),
// total abonado y que ya no exista el botón "Ver pagos".
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
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
    getByDateRange: vi.fn(async () => []),
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

import StudentDetail from '@/components/admin/StudentDetail.vue';

const student = {
  id: 'st-1',
  full_name: 'Ana Gómez',
  email: 'ana@ejemplo.com',
  phone: '600 111 222',
  notes: 'Paga a fin de mes',
  created_at: '2026-01-01',
  updated_at: '',
};

const stats = {
  student_id: 'st-1',
  total_classes: 5,
  total_hours: 5,
  classes_last_30_days: 3,
  paid_last_30_days: 60,
  pending_amount: 0,
  last_class_date: '2026-01-06',
  recent_classes: [],
};

/** Junta el texto visible y unifica espacios (el formato de moneda usa espacios raros). */
function visibleText(wrapper: any): string {
  return wrapper.text().replace(/\s+/g, ' ');
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('estado de pagos del alumno', () => {
  it('muestra "Al día" cuando no hay pagos pendientes', () => {
    const wrapper = mount(StudentDetail, {
      props: { student, stats: { ...stats, pending_amount: 0 }, recentClasses: [] },
    });

    expect(visibleText(wrapper)).toContain('Al día');
    expect(visibleText(wrapper)).not.toContain('Pendiente de cobro');
  });

  it('muestra "Pendiente de cobro" cuando debe clases', () => {
    const wrapper = mount(StudentDetail, {
      props: { student, stats: { ...stats, pending_amount: 80 }, recentClasses: [] },
    });

    expect(visibleText(wrapper)).toContain('Pendiente de cobro');
    expect(visibleText(wrapper)).not.toContain('Al día');
  });

  it('ya no tiene el botón "Ver pagos"', () => {
    const wrapper = mount(StudentDetail, {
      props: { student, stats, recentClasses: [] },
    });

    expect(visibleText(wrapper)).not.toContain('Ver pagos');
  });
});

describe('total abonado', () => {
  it('usa el total histórico que recibe por props', () => {
    const wrapper = mount(StudentDetail, {
      props: { student, stats: { ...stats, paid_last_30_days: 20 }, recentClasses: [], paidTotal: 160 },
    });

    expect(visibleText(wrapper)).toContain('Total abonado');
    expect(visibleText(wrapper)).toContain('160,00');
    expect(visibleText(wrapper)).not.toContain('Pagado (30 días)');
  });

  it('si no recibe el total histórico, usa el que informa el servidor', () => {
    const wrapper = mount(StudentDetail, {
      props: { student, stats: { ...stats, paid_last_30_days: 42 }, recentClasses: [] },
    });

    expect(visibleText(wrapper)).toContain('42,00');
  });

  it('en la pestaña Pagos muestra abonado, pendiente y total facturado', async () => {
    const wrapper = mount(StudentDetail, {
      props: { student, stats: { ...stats, pending_amount: 40 }, recentClasses: [], paidTotal: 100 },
    });

    const pagosTab = wrapper.findAll('button').find(button => button.text().trim() === 'Pagos');
    expect(pagosTab).toBeTruthy();
    await pagosTab!.trigger('click');

    const contenido = visibleText(wrapper);
    expect(contenido).toContain('Total abonado');
    expect(contenido).toContain('100,00');
    expect(contenido).toContain('40,00');
    expect(contenido).toContain('140,00');
  });
});
