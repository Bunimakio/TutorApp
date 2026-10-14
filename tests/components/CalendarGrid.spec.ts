// Casos de prueba del calendario: en el celular se ve un día por vez y en
// pantalla grande la semana completa.
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

import { useClassesStore } from '@/stores/classes';
import CalendarGrid from '@/components/calendar/CalendarGrid.vue';

/** Simula el tamaño de pantalla (el componente decide con matchMedia). */
function mockViewport(mobile: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: mobile,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as any;
}

// Semana fija (lunes 06/01/2020): así el día abierto siempre es el lunes y no
// depende de la fecha en que se corran los tests.
const MONDAY = new Date(2020, 0, 6);
const SATURDAY = new Date(2020, 0, 11);

function makeClass(overrides: Record<string, any> = {}): any {
  return {
    id: 'c-1',
    student_id: 'st-1',
    subject_id: 'su-1',
    day_of_week: 1,
    start_time: '09:00',
    end_time: '10:00',
    date: '2020-01-06',
    status: 'pending',
    notes: null,
    created_at: '',
    updated_at: '',
    student: { id: 'st-1', full_name: 'Ana Gómez', email: null },
    subject: { id: 'su-1', name: 'Matemáticas', price: 20, color: '#3B82F6' },
    ...overrides,
  };
}

function setupStore(): void {
  const store = useClassesStore();
  store.currentWeek = { start: MONDAY, end: SATURDAY };
  store.classes = [
    makeClass(),
    makeClass({
      id: 'c-2',
      day_of_week: 2,
      date: '2020-01-07',
      start_time: '11:00',
      end_time: '12:00',
      student: { id: 'st-2', full_name: 'Bruno Díaz', email: null },
    }),
  ];
}

/** Monta el calendario y espera el render (el tamaño de pantalla se lee al montar). */
async function mountGrid(): Promise<any> {
  const wrapper = mount(CalendarGrid);
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('calendario en el celular', () => {
  it('muestra un día por vez con pestañas, no la semana completa', async () => {
    mockViewport(true);
    setupStore();

    const wrapper = await mountGrid();

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs.length).toBe(6);
    expect(tabs[0].text()).toContain('Lun');
    expect(tabs[0].text()).toContain('6');

    // No se dibuja la tabla de escritorio
    expect(wrapper.find('table[role="grid"]').exists()).toBe(false);

    // Solo se ve la clase del día abierto (lunes), no la del martes
    expect(wrapper.find('[title="Ana Gómez - Matemáticas"]').exists()).toBe(true);
    expect(wrapper.find('[title="Bruno Díaz - Matemáticas"]').exists()).toBe(false);
  });

  it('deja cambiar de día con las pestañas', async () => {
    mockViewport(true);
    setupStore();

    const wrapper = await mountGrid();

    await wrapper.findAll('[role="tab"]')[1].trigger('click');

    expect(wrapper.find('[title="Bruno Díaz - Matemáticas"]').exists()).toBe(true);
    expect(wrapper.find('[title="Ana Gómez - Matemáticas"]').exists()).toBe(false);
  });
});

describe('calendario en pantalla grande', () => {
  it('muestra la semana completa', async () => {
    mockViewport(false);
    setupStore();

    const wrapper = await mountGrid();

    expect(wrapper.find('[role="tablist"]').exists()).toBe(false);

    const table = wrapper.find('table[role="grid"]');
    expect(table.exists()).toBe(true);
    // Una columna de horas + los 6 días
    expect(table.findAll('thead th').length).toBe(7);
    // Los dos alumnos se ven a la vez
    expect(table.text()).toContain('Ana Gómez');
    expect(table.text()).toContain('Bruno Díaz');
  });

  it('marca en verde las clases ya pagadas', async () => {
    mockViewport(false);
    const store = useClassesStore();
    store.currentWeek = { start: MONDAY, end: SATURDAY };
    store.classes = [makeClass({ status: 'paid' })];

    const wrapper = await mountGrid();

    expect(wrapper.html()).toContain('bg-green-100');
  });
});
