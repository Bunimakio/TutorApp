<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useStudentsStore } from '@/stores/students';
import { useClassesStore } from '@/stores/classes';
import { useUIStore } from '@/stores/ui';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import Button from '@/components/ui/Button.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Badge from '@/components/ui/Badge.vue';
import { Search, Filter, ChevronDown, ChevronUp, UserPlus, ArrowUpDown } from 'lucide-vue-next';

const studentsStore = useStudentsStore();
const classesStore = useClassesStore();
const uiStore = useUIStore();

const emit = defineEmits<{
  select: [student: any];
  create: [];
}>();

const searchQuery = ref('');
const sortBy = ref<'last_class' | 'name' | 'total_classes' | 'total_hours'>('last_class');
const sortOrder = ref<'asc' | 'desc'>('desc');

const sortOptions = [
  { value: 'last_class', label: 'Última clase' },
  { value: 'name', label: 'Nombre' },
  { value: 'total_classes', label: 'Total clases' },
  { value: 'total_hours', label: 'Horas totales' },
];

watch(searchQuery, (val) => {
  studentsStore.setFilters({ search: val });
}, { immediate: true });

watch([sortBy, sortOrder], () => {
  studentsStore.setFilters({ sortBy: sortBy.value, sortOrder: sortOrder.value });
}, { immediate: true });

async function handleSelect(student: any): Promise<void> {
  await studentsStore.fetchWithStats(student.id);
  emit('select', student);
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
</script>

<template>
  <div class="flex flex-col h-full bg-surface">
    <!-- Header con búsqueda y filtros -->
    <div class="p-4 border-b border-gray-200 flex flex-col gap-3">
      <Input
        v-model="searchQuery"
        placeholder="Buscar alumno por nombre o email..."
        icon="Search"
      />

      <div class="flex items-center gap-2">
        <Select
          v-model="sortBy"
          :options="sortOptions"
          class="flex-1 min-w-0"
        />
        <Button
          variant="ghost"
          size="sm"
          :icon="sortOrder === 'desc' ? 'ChevronDown' : 'ChevronUp'"
          @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
          aria-label="Cambiar orden"
        />
        <Button
          variant="primary"
          size="sm"
          icon="UserPlus"
          @click="$emit('create')"
          class="gap-1.5 whitespace-nowrap"
        >
          Nuevo alumno
        </Button>
      </div>
    </div>

    <!-- Lista de alumnos -->
    <div class="flex-1 overflow-y-auto">
      <div v-if="studentsStore.loading && studentsStore.students.length === 0" class="p-8 text-center text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2" />
        Cargando alumnos...
      </div>

      <div v-else-if="studentsStore.filteredStudents.length === 0" class="p-8 text-center text-gray-500">
        <Search class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p class="font-medium text-gray-700 mb-1">
          {{ searchQuery ? 'No se encontraron alumnos' : 'No hay alumnos registrados' }}
        </p>
        <p class="text-sm text-gray-500">
          {{ searchQuery ? 'Intenta con otra búsqueda' : 'Pulsa "Nuevo alumno" para empezar' }}
        </p>
      </div>

      <ul v-else class="divide-y divide-gray-100" role="listbox" aria-label="Lista de alumnos">
        <li
          v-for="student in studentsStore.filteredStudents"
          :key="student.id"
          @click="handleSelect(student)"
          class="p-4 hover:bg-gray-50 cursor-pointer transition-colors flex items-center gap-4"
          :class="{
            'bg-primary-50': studentsStore.selectedStudent?.id === student.id,
            'ring-2 ring-primary-500': studentsStore.selectedStudent?.id === student.id,
          }"
          role="option"
          :aria-selected="studentsStore.selectedStudent?.id === student.id"
        >
          <Avatar
            :name="student.full_name"
            :size="'md'"
            :shape="'circle'"
          />

          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">{{ student.full_name }}</p>
            <div class="flex items-center gap-3 mt-1 text-sm text-gray-500">
              <span v-if="student.email" class="flex items-center gap-1 truncate">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {{ student.email }}
              </span>
              <span v-if="student.total_classes !== undefined" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {{ student.total_classes }} clases
              </span>
              <span v-if="student.total_hours !== undefined" class="flex items-center gap-1">
                <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {{ student.total_hours.toFixed(1) }}h
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <Badge
              v-if="student.last_class_date"
              variant="default"
              size="sm"
              class="hidden sm:inline-flex"
            >
              Última: {{ new Date(student.last_class_date).toLocaleDateString('es-ES') }}
            </Badge>
            <Badge
              v-if="student.classes_last_month !== undefined && student.classes_last_month > 0"
              variant="info"
              size="sm"
            >
              {{ student.classes_last_month }} este mes
            </Badge>
            <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </li>
      </ul>
    </div>

    <!-- Indicador de carga -->
    <div v-if="studentsStore.loading" class="p-3 border-t border-gray-200">
      <div class="flex items-center justify-center gap-2 text-sm text-gray-500">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500" />
        Actualizando...
      </div>
    </div>
  </div>
</template>