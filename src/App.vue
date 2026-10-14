<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { useClassesStore } from '@/stores/classes';
import { useSyncStore } from '@/stores/sync';
import { RouterView, RouterLink } from 'vue-router';
import { LayoutDashboard, Users, BookOpen, Wallet, Settings, LogOut, Menu, X, ChevronDown, Bell, Wifi, WifiOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-vue-next';

const authStore = useAuthStore();
const uiStore = useUIStore();
const classesStore = useClassesStore();
const syncStore = useSyncStore();

const mobileMenuOpen = ref(false);

onMounted(async () => {
  await authStore.initialize();
  await syncStore.initialize();
});

function handleSignOut(): void {
  authStore.signOut();
  mobileMenuOpen.value = false;
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <!-- Header superior -->
    <header class="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-gray-200 z-40 flex items-center justify-between px-4">
      <!-- Botón menú móvil -->
      <button
        @click="mobileMenuOpen = !mobileMenuOpen"
        class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
        aria-label="Menú"
        aria-expanded="mobileMenuOpen"
      >
        <component :is="mobileMenuOpen ? X : Menu" class="w-6 h-6" />
      </button>

      <!-- Logo/Título -->
      <div class="flex items-center gap-3 flex-1 lg:hidden">
        <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <LayoutDashboard class="w-5 h-5 text-white" />
        </div>
        <span class="font-bold text-gray-900">TutorApp</span>
      </div>

      <!-- Navegación principal (desktop) -->
      <nav class="hidden lg:flex items-center gap-1 ml-8" aria-label="Navegación principal">
        <RouterLink
          v-for="route in [
            { path: '/', icon: LayoutDashboard, label: 'Calendario' },
            { path: '/admin', icon: Users, label: 'Alumnos' },
            { path: '/subjects', icon: BookOpen, label: 'Asignaturas' },
            { path: '/payments', icon: Wallet, label: 'Pagos' },
            { path: '/settings', icon: Settings, label: 'Configuración' }
          ]"
          :key="route.path"
          :to="route.path"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          :class="{ 'bg-primary-50 text-primary-700': $route.path === route.path }"
        >
          <component :is="route.icon" class="w-5 h-5" />
          {{ route.label }}
        </RouterLink>
      </nav>

      <!-- Acciones derechas -->
      <div class="flex items-center gap-2">
        <!-- Estado sync -->
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
          :class="syncStore.isOnline ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'">
          <component :is="syncStore.isOnline ? Wifi : WifiOff" class="w-3.5 h-3.5" />
          <span>{{ syncStore.isOnline ? 'Online' : 'Offline' }}</span>
        </div>

        <span v-if="syncStore.isSyncing" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-blue-50 text-blue-700">
          <RefreshCw class="w-3.5 h-3.5 animate-spin" />
          Sync...
        </span>

        <span v-else-if="syncStore.pendingCount > 0" class="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-yellow-50 text-yellow-700">
          <AlertCircle class="w-3.5 h-3.5" />
          {{ syncStore.pendingCount }} pendientes
        </span>

        <!-- Notificaciones -->
        <button class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 relative" aria-label="Notificaciones">
          <Bell class="w-5 h-5" />
          <span v-if="uiStore.notifications.length > 0" class="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {{ uiStore.notifications.length > 9 ? '9+' : uiStore.notifications.length }}
          </span>
        </button>

        <!-- Usuario -->
        <div class="hidden lg:flex items-center gap-3 pl-4 border-l border-gray-200">
          <div class="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium text-sm">
            {{ authStore.user?.email?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">{{ authStore.user?.email || 'Usuario' }}</p>
            <p class="text-xs text-gray-500">Administrador</p>
          </div>
          <button @click="handleSignOut" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Cerrar sesión">
            <LogOut class="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

    <!-- Menú lateral móvil -->
    <Transition name="slide">
      <div v-if="mobileMenuOpen" class="fixed inset-0 z-50 lg:hidden" @click="mobileMenuOpen = false">
        <div class="absolute inset-0 bg-black/50" />
        <aside class="absolute top-16 left-0 w-64 bg-surface shadow-xl h-[calc(100vh-4rem)] overflow-y-auto" @click.stop>
          <nav class="p-4 space-y-1" aria-label="Navegación móvil">
            <RouterLink
              v-for="route in [
                { path: '/', icon: LayoutDashboard, label: 'Calendario' },
                { path: '/admin', icon: Users, label: 'Alumnos' },
                { path: '/subjects', icon: BookOpen, label: 'Asignaturas' },
                { path: '/payments', icon: Wallet, label: 'Pagos' },
                { path: '/settings', icon: Settings, label: 'Configuración' }
              ]"
              :key="route.path"
              :to="route.path"
              @click="mobileMenuOpen = false"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              :class="{ 'bg-primary-50 text-primary-700': $route.path === route.path }"
            >
              <component :is="route.icon" class="w-5 h-5" />
              {{ route.label }}
            </RouterLink>

            <div class="pt-4 border-t border-gray-200">
              <button @click="handleSignOut" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 w-full transition-colors">
                <LogOut class="w-5 h-5" />
                Cerrar sesión
              </button>
            </div>
          </nav>
        </aside>
      </div>
    </Transition>

    <!-- Contenido principal -->
    <main class="flex-1 pt-16 lg:pl-0 min-h-0">
      <RouterView v-slot="{ Component }">
        <component :is="Component" class="h-full" />
      </RouterView>
    </main>

    <!-- Notificaciones toast -->
    <TransitionGroup name="toast" tag="div" class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 lg:bottom-6 lg:right-6">
      <div
        v-for="notif in uiStore.notifications"
        :key="notif.id"
        @click="uiStore.dismissNotification(notif.id)"
        class="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg min-w-[300px] max-w-md animate-slide-in"
        :class="[
          'bg-surface border-l-4',
          notif.type === 'success' ? 'border-green-500' :
          notif.type === 'error' ? 'border-red-500' :
          notif.type === 'warning' ? 'border-yellow-500' : 'border-blue-500'
        ]"
        role="alert"
      >
        <component
          :is="notif.type === 'success' ? CheckCircle : AlertCircle"
          :class="[
            'w-5 h-5 flex-shrink-0',
            notif.type === 'success' ? 'text-green-500' :
            notif.type === 'error' ? 'text-red-500' :
            notif.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
          ]"
        />
        <p class="text-sm text-gray-700 flex-1">{{ notif.message }}</p>
        <button @click.stop="uiStore.dismissNotification(notif.id)" class="text-gray-400 hover:text-gray-600 p-1">
          <X class="w-4 h-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}
.animate-slide-in {
  animation: slideIn 0.3s ease;
}
@keyframes slideIn {
  from { opacity: 0; transform: translateX(100px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>