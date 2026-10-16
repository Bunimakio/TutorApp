// El botón "Exportar datos" de Ajustes debe descargar un respaldo con
// alumnos, asignaturas y clases.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn(), auth: { getSession: vi.fn(), onAuthStateChange: vi.fn() } },
  auth: { updatePassword: vi.fn(), signOut: vi.fn() },
  getCurrentUserId: vi.fn(async () => 'user-1'),
  db: {
    classes: {
      getAll: vi.fn(async () => ({ data: [{ id: 'c1' }, { id: 'c2' }], error: null })),
      create: vi.fn(),
      update: vi.fn(),
      updateStatus: vi.fn(),
      checkConflict: vi.fn(),
      getByStudent: vi.fn(),
      getPaidByStudent: vi.fn(),
      delete: vi.fn(),
      getByWeek: vi.fn(async () => ({ data: [], error: null })),
    },
    students: {
      getAll: vi.fn(async () => ({ data: [{ id: 's1' }, { id: 's2' }, { id: 's3' }], error: null })),
      getById: vi.fn(),
      getWithStats: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      search: vi.fn(),
    },
    subjects: {
      getAll: vi.fn(async () => ({ data: [{ id: 'm1' }], error: null })),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/lib/indexeddb', () => ({
  offlineClasses: { put: vi.fn(), getAll: vi.fn(async () => []), getById: vi.fn(async () => null), getByDateRange: vi.fn(), delete: vi.fn() },
  offlineStudents: { put: vi.fn(), getAll: vi.fn(async () => []), getById: vi.fn(async () => null), delete: vi.fn() },
  offlineSubjects: { put: vi.fn(), getAll: vi.fn(async () => []), getById: vi.fn(async () => null), delete: vi.fn() },
  offlineMeta: { put: vi.fn(), get: vi.fn(async () => null), getAll: vi.fn(async () => []), delete: vi.fn(), getLastSync: vi.fn(async () => null) },
  initOfflineDB: vi.fn(async () => {}),
}));

vi.mock('@/lib/sync', () => ({
  syncService: {
    queueCreate: vi.fn(), queueUpdate: vi.fn(), queueDelete: vi.fn(),
    checkOnline: vi.fn(async () => true), getPendingCount: vi.fn(async () => 0),
    syncAll: vi.fn(async () => ({ success: 0, failed: 0, conflicts: 0 })),
    subscribe: vi.fn(() => () => {}), startAutoSync: vi.fn(), stopAutoSync: vi.fn(),
  },
  startAutoSync: vi.fn(),
  stopAutoSync: vi.fn(),
}));

vi.mock('@/lib/demo', () => ({
  loadDemoData: vi.fn(async () => ({ students: 0, classes: 0, subjects: 0 })),
  deleteDemoData: vi.fn(async () => ({ students: 0, subjects: 0 })),
}));

vi.mock('@/lib/export', () => ({
  downloadJson: vi.fn(),
  exportFileName: vi.fn(() => 'tutorapp-respaldo-test.json'),
  buildExportPayload: vi.fn((data: any) => ({
    app: 'TutorApp',
    version: '1.0.0',
    exportedAt: '2026-10-15T00:00:00.000Z',
    counts: { students: data.students.length, subjects: data.subjects.length, classes: data.classes.length },
    data,
  })),
}));

import { db } from '@/lib/supabase';
import { buildExportPayload, downloadJson, exportFileName } from '@/lib/export';
import SettingsView from '@/views/SettingsView.vue';

function findButton(wrapper: any, label: string) {
  return wrapper.findAll('button').find((button: any) => button.text().includes(label));
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('exportar datos en Ajustes', () => {
  it('descarga un respaldo con alumnos, asignaturas y clases', async () => {
    const wrapper = mount(SettingsView);

    await findButton(wrapper, 'Exportar datos')!.trigger('click');
    await flushPromises();

    expect(db.students.getAll).toHaveBeenCalled();
    expect(db.subjects.getAll).toHaveBeenCalled();
    expect(db.classes.getAll).toHaveBeenCalled();
    expect(exportFileName).toHaveBeenCalled();
    expect(buildExportPayload).toHaveBeenCalledWith({
      students: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
      subjects: [{ id: 'm1' }],
      classes: [{ id: 'c1' }, { id: 'c2' }],
    });
    expect(downloadJson).toHaveBeenCalledTimes(1);
    expect(vi.mocked(downloadJson).mock.calls[0][0]).toBe('tutorapp-respaldo-test.json');
  });
});
