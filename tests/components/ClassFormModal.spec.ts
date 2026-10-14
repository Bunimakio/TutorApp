// Casos de prueba del modal de clase: la casilla "Abonado (pago confirmado)".
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
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
import ClassFormModal from '@/components/calendar/ClassFormModal.vue';

function makeClass(overrides: Record<string, any> = {}): any {
  return {
    id: 'c-1',
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
    student: { id: 'st-1', full_name: 'Ana Gómez', email: 'ana@ejemplo.com' },
    subject: { id: 'su-1', name: 'Matemáticas', price: 20, color: '#3B82F6' },
    ...overrides,
  };
}

/** Monta el modal cerrado y lo abre, para que se complete el formulario. */
async function openModal(initialData: any): Promise<any> {
  const wrapper = mount(ClassFormModal, {
    props: { modelValue: false, mode: 'edit', initialData },
  });
  await wrapper.setProps({ modelValue: true });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.mocked(db.classes.checkConflict).mockResolvedValue({ data: [], error: null } as any);
  vi.mocked(db.students.getAll).mockResolvedValue({ data: [], error: null } as any);
});

describe('casilla de pago del modal de clase', () => {
  it('en una clase pendiente se puede marcar y está desmarcada', async () => {
    const wrapper = await openModal(makeClass());
    const checkbox = wrapper.find('input[type="checkbox"]');

    expect(checkbox.exists()).toBe(true);
    expect(checkbox.attributes('disabled')).toBeUndefined();
    expect((checkbox.element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.text()).toContain('Abonado (pago confirmado)');
  });

  it('al marcarla y guardar, el formulario envía paid: true', async () => {
    const wrapper = await openModal(makeClass());

    await wrapper.find('input[type="checkbox"]').setValue(true);
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents).toBeTruthy();
    expect((submitEvents![0][0] as any).paid).toBe(true);
  });

  it('una clase ya pagada queda marcada, bloqueada y avisada', async () => {
    const wrapper = await openModal(makeClass({ status: 'paid' }));
    const checkbox = wrapper.find('input[type="checkbox"]');

    expect(checkbox.attributes('disabled')).toBeDefined();
    expect((checkbox.element as HTMLInputElement).checked).toBe(true);
    expect(wrapper.text()).toContain('no se puede deshacer');
  });

  it('una clase cancelada no permite confirmar el pago', async () => {
    const wrapper = await openModal(makeClass({ status: 'cancelled' }));
    const checkbox = wrapper.find('input[type="checkbox"]');

    expect(checkbox.attributes('disabled')).toBeDefined();
    expect((checkbox.element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.text()).toContain('cancelada');
  });
});
