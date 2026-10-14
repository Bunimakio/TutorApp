// Casos de prueba de la sección "Datos de prueba" en Ajustes.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() } },
  auth: { updatePassword: vi.fn(), signOut: vi.fn() },
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
      getAll: vi.fn(async () => ({ data: [], error: null })),
      getByWeek: vi.fn(async () => ({ data: [], error: null })),
    },
    students: {
      getAll: vi.fn(async () => ({ data: [], error: null })),
      getById: vi.fn(),
      getWithStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
    },
    subjects: {
      getAll: vi.fn(async () => ({ data: [], error: null })),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
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
  offlineMeta: {
    put: vi.fn(async () => {}),
    get: vi.fn(async () => null),
    getAll: vi.fn(async () => []),
    delete: vi.fn(async () => {}),
  },
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
    startAutoSync: vi.fn(),
    stopAutoSync: vi.fn(),
  },
  startAutoSync: vi.fn(),
  stopAutoSync: vi.fn(),
}));

vi.mock('@/lib/demo', () => ({
  loadDemoData: vi.fn(async () => ({ students: 7, classes: 29, subjects: 0 })),
  deleteDemoData: vi.fn(async () => ({ students: 7, subjects: 0 })),
}));

import { db } from '@/lib/supabase';
import { loadDemoData, deleteDemoData } from '@/lib/demo';
import { useStudentsStore } from '@/stores/students';
import { useSubjectsStore } from '@/stores/subjects';
import SettingsView from '@/views/SettingsView.vue';

function findButton(wrapper: any, label: string) {
  return wrapper.findAll('button').find((button: any) => button.text().includes(label));
}

beforeEach(() => {
  setActivePinia(createPinia());
  vi.mocked(loadDemoData).mockResolvedValue({ students: 7, classes: 29, subjects: 0 });
  vi.mocked(deleteDemoData).mockResolvedValue({ students: 7, subjects: 0 });
  vi.stubGlobal('confirm', vi.fn(() => true));
});

describe('sección de datos de prueba en Ajustes', () => {
  it('muestra la sección con los dos botones', () => {
    const wrapper = mount(SettingsView);

    expect(wrapper.text()).toContain('Datos de prueba');
    expect(findButton(wrapper, 'Cargar datos de prueba')).toBeTruthy();
    expect(findButton(wrapper, 'Borrar datos de prueba')).toBeTruthy();
  });

  it('al cargar: crea los datos y refresca las listas', async () => {
    const wrapper = mount(SettingsView);

    await findButton(wrapper, 'Cargar datos de prueba')!.trigger('click');
    await flushPromises();

    expect(loadDemoData).toHaveBeenCalledTimes(1);
    expect(db.students.getAll).toHaveBeenCalled();
    expect(db.subjects.getAll).toHaveBeenCalled();
    expect(useStudentsStore().students).toEqual([]);
    expect(useSubjectsStore().subjects).toEqual([]);
  });

  it('al borrar: pide confirmación y elimina los datos de prueba', async () => {
    const wrapper = mount(SettingsView);

    await findButton(wrapper, 'Borrar datos de prueba')!.trigger('click');
    await flushPromises();

    expect(confirm).toHaveBeenCalled();
    expect(deleteDemoData).toHaveBeenCalledTimes(1);
  });
});
