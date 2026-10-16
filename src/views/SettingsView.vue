<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useSyncStore } from '@/stores/sync';
import { useUIStore } from '@/stores/ui';
import { useThemeStore } from '@/stores/theme';
import { useClassesStore } from '@/stores/classes';
import { useStudentsStore } from '@/stores/students';
import { useSubjectsStore } from '@/stores/subjects';
import { loadDemoData, deleteDemoData } from '@/lib/demo';
import { db } from '@/lib/supabase';
import { buildExportPayload, downloadJson, exportFileName } from '@/lib/export';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import Card from '@/components/ui/Card.vue';
import { User, Mail, Lock, Database, RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle, LogOut, Moon, Sun, Monitor, Download, Info, FlaskConical } from 'lucide-vue-next';

const authStore = useAuthStore();
const syncStore = useSyncStore();
const uiStore = useUIStore();
const themeStore = useThemeStore();
const classesStore = useClassesStore();
const studentsStore = useStudentsStore();
const subjectsStore = useSubjectsStore();

const newPassword = ref('');
const confirmPassword = ref('');
const showPasswordChange = ref(false);
const passwordError = ref('');

// Opciones de apariencia (modo claro / oscuro)
const themeOptions = [
  { id: 'light' as const, label: 'Claro', icon: Sun },
  { id: 'dark' as const, label: 'Oscuro', icon: Moon },
];

async function handlePasswordChange(): Promise<void> {
  passwordError.value = '';

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Las contraseñas no coinciden';
    return;
  }

  if (newPassword.value.length < 8) {
    passwordError.value = 'La contraseña debe tener al menos 8 caracteres';
    return;
  }

  try {
    await authStore.updatePassword(newPassword.value);
    newPassword.value = '';
    confirmPassword.value = '';
    showPasswordChange.value = false;
    uiStore.notify('success', 'Contraseña actualizada correctamente');
  } catch (e: any) {
    passwordError.value = e.message || 'Error al cambiar contraseña';
  }
}

async function handleSignOut(): Promise<void> {
  await authStore.signOut();
}

async function handleForceSync(): Promise<void> {
  await syncStore.forceSync();
  if (!syncStore.syncError) {
    uiStore.notify('success', 'Sincronización completada');
  }
}

const exportLoading = ref(false);

async function handleExportData(): Promise<void> {
  exportLoading.value = true;
  try {
    const [students, subjects, classes] = await Promise.all([
      db.students.getAll(),
      db.subjects.getAll(),
      db.classes.getAll(),
    ]);

    const payload = buildExportPayload({
      students: students.data ?? [],
      subjects: subjects.data ?? [],
      classes: classes.data ?? [],
    });

    downloadJson(exportFileName(), payload);
    uiStore.notify(
      'success',
      `Respaldo descargado: ${payload.counts.students} alumnos, ${payload.counts.subjects} asignaturas, ${payload.counts.classes} clases`
    );
  } catch (e: any) {
    uiStore.notify('error', e?.message ? `No se pudo exportar: ${e.message}` : 'No se pudieron exportar los datos');
  } finally {
    exportLoading.value = false;
  }
}

// Datos de prueba (alumnos, clases y pagos de ejemplo)
const demoLoading = ref(false);

async function refreshAfterDemo(): Promise<void> {
  await Promise.all([studentsStore.fetchAll(true), subjectsStore.fetchAll(true)]);
  await classesStore.fetchWeek(classesStore.currentWeek.start, classesStore.currentWeek.end);
}

async function handleLoadDemo(): Promise<void> {
  demoLoading.value = true;
  try {
    const result = await loadDemoData();
    await refreshAfterDemo();
    uiStore.notify('success', `Listo: ${result.students} alumnos y ${result.classes} clases de prueba`);
  } catch (e: any) {
    uiStore.notify('error', e?.message ? `No se pudieron crear: ${e.message}` : 'No se pudieron crear los datos de prueba');
  } finally {
    demoLoading.value = false;
  }
}

async function handleDeleteDemo(): Promise<void> {
  if (!confirm('¿Borrar todos los datos de prueba ([DEMO])? Se eliminan sus alumnos, clases y asignaturas de ejemplo.')) {
    return;
  }

  demoLoading.value = true;
  try {
    const result = await deleteDemoData();
    await refreshAfterDemo();
    uiStore.notify('success', `Se borraron ${result.students} alumnos de prueba`);
  } catch (e: any) {
    uiStore.notify('error', e?.message ? `No se pudieron borrar: ${e.message}` : 'No se pudieron borrar los datos de prueba');
  } finally {
    demoLoading.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-8">
    <!-- Cuenta -->
    <section>
      <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <User class="w-5 h-5 text-primary-600" />
        Cuenta
      </h2>

      <Card class="p-6 space-y-6">
        <div class="flex items-center gap-4">
          <div class="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center text-2xl font-bold text-primary-700">
            {{ authStore.user?.email?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div>
            <h3 class="text-lg font-medium text-gray-900">{{ authStore.user?.email || 'Usuario' }}</h3>
            <p class="text-sm text-gray-500">Administrador</p>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200">
          <h4 class="font-medium text-gray-900 mb-3">Cambiar contraseña</h4>
          <div v-if="!showPasswordChange" class="space-y-2">
            <p class="text-sm text-gray-500">Tu contraseña actual es segura. Puedes cambiarla si lo deseas.</p>
            <Button variant="outline" icon="Lock" @click="showPasswordChange = true" class="gap-1.5">
              Cambiar contraseña
            </Button>
          </div>

          <div v-else class="space-y-4">
            <Input
              v-model="newPassword"
              type="password"
              label="Nueva contraseña"
              placeholder="Mínimo 8 caracteres"
              icon="Lock"
              :hint="newPassword ? 'Fortaleza: ' + (newPassword.length >= 8 ? 'Fuerte' : 'Débil') : ''"
            />
            <Input
              v-model="confirmPassword"
              type="password"
              label="Confirmar nueva contraseña"
              placeholder="••••••••"
              icon="Lock"
            />
            <p v-if="passwordError" class="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle class="w-4 h-4" /> {{ passwordError }}
            </p>
            <div class="flex justify-end gap-2">
              <Button variant="ghost" @click="showPasswordChange = false">Cancelar</Button>
              <Button variant="primary" @click="handlePasswordChange" :loading="authStore.loading">
                Guardar nueva contraseña
              </Button>
            </div>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200">
          <Button variant="outline" icon="LogOut" @click="handleSignOut" class="gap-1.5 text-red-600 border-red-300 hover:bg-red-50">
            Cerrar sesión
          </Button>
        </div>
      </Card>
    </section>

    <!-- Sincronización -->
    <section>
      <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Database class="w-5 h-5 text-primary-600" />
        Sincronización y datos
      </h2>

      <Card class="p-6 space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-medium text-gray-900">Estado de conexión</h3>
            <p class="text-sm text-gray-500">Última sincronización: {{ syncStore.lastSyncTime ? new Date(syncStore.lastSyncTime).toLocaleString() : 'Nunca' }}</p>
          </div>
          <div class="flex items-center gap-2">
            <span :class="syncStore.isOnline ? 'text-green-600' : 'text-orange-600'" class="flex items-center gap-1">
              <component :is="syncStore.isOnline ? Wifi : WifiOff" class="w-5 h-5" />
              {{ syncStore.isOnline ? 'En línea' : 'Sin conexión' }}
            </span>
          </div>
        </div>

        <div v-if="syncStore.isSyncing" class="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <RefreshCw class="w-6 h-6 text-blue-600 animate-spin" />
          <div>
            <p class="font-medium text-blue-800">Sincronizando...</p>
            <p class="text-sm text-blue-600">{{ syncStore.pendingCount }} elementos pendientes</p>
          </div>
        </div>

        <div v-else-if="syncStore.pendingCount > 0" class="flex items-center gap-3 p-4 bg-yellow-50 rounded-lg">
          <AlertCircle class="w-6 h-6 text-yellow-600" />
          <div class="flex-1">
            <p class="font-medium text-yellow-800">Cambios pendientes de sincronizar</p>
            <p class="text-sm text-yellow-700">{{ syncStore.pendingCount }} elementos en cola</p>
          </div>
          <Button variant="primary" size="sm" @click="handleForceSync">Sincronizar ahora</Button>
        </div>

        <div v-else class="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <CheckCircle class="w-6 h-6 text-green-600" />
          <div>
            <p class="font-medium text-green-800">Todo sincronizado</p>
            <p class="text-sm text-green-600">No hay cambios pendientes</p>
          </div>
        </div>

        <div class="pt-4 border-t border-gray-200 flex flex-wrap gap-3">
          <Button variant="outline" icon="RefreshCw" @click="handleForceSync" class="gap-1.5" :loading="syncStore.isSyncing">
            Forzar sincronización
          </Button>
          <Button variant="outline" icon="Download" @click="handleExportData" class="gap-1.5" :loading="exportLoading">
            Exportar datos
          </Button>
        </div>
      </Card>
    </section>

    <!-- Datos de prueba -->
    <section>
      <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <FlaskConical class="w-5 h-5 text-primary-600" />
        Datos de prueba
      </h2>

      <Card class="p-6 space-y-4">
        <p class="text-sm text-gray-500">
          Crea alumnos, clases y pagos de ejemplo (todos empiezan con
          <span class="font-medium text-gray-700">[DEMO]</span>) para probar el
          calendario y la sección de pagos con varios alumnos a la vez.
        </p>
        <p class="text-sm text-gray-500">
          Incluye un alumno al día, uno con deuda, uno con clases canceladas,
          uno sin clases, uno con la semana cargada y clases sin precio.
        </p>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" icon="Plus" :loading="demoLoading" @click="handleLoadDemo" class="gap-1.5">
            Cargar datos de prueba
          </Button>
          <Button variant="ghost" icon="Trash2" :disabled="demoLoading" @click="handleDeleteDemo" class="gap-1.5 text-red-600 border-red-300 hover:bg-red-50">
            Borrar datos de prueba
          </Button>
        </div>
      </Card>
    </section>

    <!-- Apariencia -->
    <section>
      <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Monitor class="w-5 h-5 text-primary-600" />
        Apariencia
      </h2>

      <Card class="p-6 space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="option in themeOptions"
            :key="option.id"
            type="button"
            :aria-pressed="themeStore.mode === option.id"
            @click="themeStore.setMode(option.id)"
            :class="[
              'p-4 rounded-lg border-2 transition-all text-center',
              themeStore.mode === option.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
            ]"
          >
            <component
              :is="option.icon"
              class="w-8 h-8 mx-auto mb-2"
              :class="themeStore.mode === option.id ? 'text-primary-600' : 'text-gray-400'"
            />
            <p class="font-medium" :class="themeStore.mode === option.id ? 'text-primary-700' : 'text-gray-700'">
              {{ option.label }}
            </p>
          </button>
        </div>
        <p class="text-sm text-gray-500 text-center">El modo se guarda en este dispositivo.</p>
      </Card>
    </section>

    <!-- Información de la app -->
    <section>
      <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Info class="w-5 h-5 text-primary-600" />
        Información
      </h2>

      <Card class="p-6 space-y-3 text-sm text-gray-600">
        <div class="flex justify-between"><span>Versión</span><span class="font-mono text-gray-900">1.0.0</span></div>
        <div class="flex justify-between"><span>Framework</span><span class="font-mono text-gray-900">Vue 3 + TypeScript</span></div>
        <div class="flex justify-between"><span>Backend</span><span class="font-mono text-gray-900">Supabase (PostgreSQL)</span></div>
        <div class="flex justify-between"><span>Offline</span><span class="font-mono text-gray-900">IndexedDB + Service Worker</span></div>
        <div class="flex justify-between"><span>Licencia</span><span class="font-mono text-gray-900">MIT</span></div>
      </Card>
    </section>
  </div>
</template>