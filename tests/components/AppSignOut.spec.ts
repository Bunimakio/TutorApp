// Al cerrar sesión la app debe volver a la pantalla de login.
// Antes el store ponía el usuario en null pero nadie navegaba.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: 'user-1', email: 'tutor@demo.com' } } },
        error: null,
      })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
  auth: { updatePassword: vi.fn(), signOut: vi.fn(async () => ({ error: null })) },
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
  offlineClasses: { put: vi.fn(), getAll: vi.fn(async () => []), getById: vi.fn(async () => null), getByDateRange: vi.fn(async () => []), delete: vi.fn() },
  offlineStudents: { put: vi.fn(), getAll: vi.fn(async () => []), getById: vi.fn(async () => null), delete: vi.fn() },
  offlineSubjects: { put: vi.fn(), getAll: vi.fn(async () => []), getById: vi.fn(async () => null), delete: vi.fn() },
  offlineMeta: { put: vi.fn(), get: vi.fn(async () => null), getAll: vi.fn(async () => []), delete: vi.fn(), getLastSync: vi.fn(async () => null) },
  initOfflineDB: vi.fn(async () => {}),
}));

vi.mock('@/lib/sync', () => ({
  syncService: {
    queueCreate: vi.fn(async () => {}),
    queueUpdate: vi.fn(async () => {}),
    queueDelete: vi.fn(async () => {}),
    checkOnline: vi.fn(async () => true),
    getPendingCount: vi.fn(async () => 0),
    syncAll: vi.fn(async () => ({ succeeded: 0, failed: 0 })),
    subscribe: vi.fn(() => () => {}),
    startAutoSync: vi.fn(),
    stopAutoSync: vi.fn(),
  },
  startAutoSync: vi.fn(),
  stopAutoSync: vi.fn(),
}));

import App from '@/App.vue';
import { useAuthStore } from '@/stores/auth';

const LoginStub = { template: '<div>Login</div>' };
const CalendarStub = { template: '<div>Calendario</div>' };

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'calendar', component: CalendarStub },
      { path: '/login', name: 'login', component: LoginStub },
    ],
  });
}

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('cerrar sesión', () => {
  it('después de cerrar sesión navega a la pantalla de login', async () => {
    const router = makeRouter();
    router.push('/');
    await router.isReady();

    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    const auth = useAuthStore();
    expect(auth.isAuthenticated).toBe(true);
    expect(router.currentRoute.value.name).toBe('calendar');

    const signOutBtn = wrapper
      .findAll('button')
      .find(button => button.attributes('aria-label') === 'Cerrar sesión');
    expect(signOutBtn).toBeTruthy();

    await signOutBtn!.trigger('click');
    await flushPromises();

    expect(auth.isAuthenticated).toBe(false);
    expect(router.currentRoute.value.name).toBe('login');
  });
});
