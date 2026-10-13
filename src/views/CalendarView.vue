<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useClassesStore } from '@/stores/classes';
import { useAuthStore } from '@/stores/auth';
import { useSyncStore } from '@/stores/sync';
import { useUIStore } from '@/stores/ui';
import { CalendarGrid, WeekNavigator, ClassFormModal } from '@/components/calendar';
import { AlertCircle, WifiOff, Wifi, RefreshCw, Bell } from 'lucide-vue-next';

const classesStore = useClassesStore();
const authStore = useAuthStore();
const syncStore = useSyncStore();
const uiStore = useUIStore();

const showClassForm = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const selectedClass = ref<any>(null);
const preselectedCell = ref<any>(null);

onMounted(async () => {
  // Cargar semana actual
  classesStore.fetchWeek(classesStore.currentWeek.start, classesStore.currentWeek.end);

  // Cargar asignaturas
  const subjectsStore = (await import('@/stores/subjects')).useSubjectsStore();
  await subjectsStore.fetchAll();
});

// NOTA: no vigilamos `classesStore.currentWeek` aquí a propósito.
// `fetchWeek()` reasigna `currentWeek` y un watch que vuelva a llamar a
// `fetchWeek` crea un bucle infinito de peticiones. El store ya se encarga
// de recargar al navegar semanas (`navigateWeek` / `goToToday`).

function handleCellClick(cell: any): void {
  if (cell.class) {
    // Click en clase existente
    selectedClass.value = cell.class;
    formMode.value = 'edit';
    showClassForm.value = true;
  } else {
    // Click en celda vacía
    preselectedCell.value = cell;
    formMode.value = 'create';
    showClassForm.value = true;
  }
}

function handleClassClick(classSession: any, event: MouseEvent): void {
  event.stopPropagation();
  selectedClass.value = classSession;
  formMode.value = 'edit';
  showClassForm.value = true;
}

function handleStatusChange(classSession: any, status: 'pending' | 'paid' | 'cancelled'): void {
  classesStore.updateStatus(classSession.id, status);
}

async function handleFormSubmit(formData: any): Promise<void> {
  if (formMode.value === 'create') {
    await classesStore.create(formData);
  } else if (formMode.value === 'edit' && selectedClass.value) {
    await classesStore.update(selectedClass.value.id, formData);
  }
  showClassForm.value = false;
}

function handleNavigateWeek(direction: 'prev' | 'next'): void {
  classesStore.navigateWeek(direction);
}

function handleGoToToday(): void {
  classesStore.goToToday();
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 bg-gray-50">
    <!-- Header del calendario -->
    <WeekNavigator
      @navigate="handleNavigateWeek"
      @goToToday="handleGoToToday"
    />

    <!-- Indicador de sync -->
    <div class="px-4 py-2 flex items-center justify-between border-b border-gray-200 bg-surface">
      <div class="flex items-center gap-3">
        <span
          :class="[
            'flex items-center gap-1.5 text-sm px-2 py-1 rounded-full',
            syncStore.isOnline ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'
          ]"
        >
          <component
            :is="syncStore.isOnline ? Wifi : WifiOff"
            class="w-4 h-4"
          />
          {{ syncStore.statusText }}
        </span>

        <span v-if="syncStore.isSyncing" class="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
          <RefreshCw class="w-4 h-4 animate-spin" />
          Sincronizando...
        </span>

        <span v-else-if="syncStore.pendingCount > 0" class="flex items-center gap-1.5 text-sm text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full">
          <AlertCircle class="w-4 h-4" />
          {{ syncStore.pendingCount }} cambios pendientes
        </span>
      </div>

      <Button
        variant="ghost"
        size="sm"
        icon="Bell"
        @click="$emit('notify', { type: 'info', message: 'Notificaciones próximamente' })"
        aria-label="Notificaciones"
      />
    </div>

    <!-- Grid del calendario -->
    <div class="flex-1 overflow-auto p-4">
      <CalendarGrid
        @cell-click="handleCellClick"
        @class-click="handleClassClick"
        @class-status-change="handleStatusChange"
      />
    </div>

    <!-- Modal formulario clase -->
    <ClassFormModal
      v-model="showClassForm"
      :mode="formMode"
      :initial-data="selectedClass"
      :preselected-cell="preselectedCell"
      @submit="handleFormSubmit"
      @close="showClassForm = false"
    />
  </div>
</template>