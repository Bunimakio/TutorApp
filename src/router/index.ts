import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'calendar',
      component: () => import('@/views/CalendarView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('@/views/AdminView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/subjects',
      name: 'subjects',
      component: () => import('@/views/SubjectsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('@/views/PaymentsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { guest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guest: true },
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import('@/views/ResetPasswordView.vue'),
      meta: { guest: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
});

// Guardia de navegación
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // Esperar a que se inicialice el auth (con timeout de 3s)
  if (authStore.loading) {
    try {
      await Promise.race([
        new Promise(resolve => {
          const unwatch = authStore.$subscribe(() => {
            if (!authStore.loading) {
              unwatch();
              resolve(true);
            }
          });
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth init timeout')), 3000))
      ]);
    } catch {
      // Timeout o error: continuar anyway (modo demo)
      console.warn('Auth init timeout, continuando en modo demo');
    }
  }

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  const guestOnly = to.matched.some(record => record.meta.guest);

  if (requiresAuth && !authStore.isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } });
  } else if (guestOnly && authStore.isAuthenticated) {
    next({ name: 'calendar' });
  } else {
    next();
  }
});

export default router;