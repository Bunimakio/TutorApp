<script setup lang="ts">
import { useClassesStore } from '@/stores/classes';
import type { CalendarCell, ClassSession } from '@/types';
import { Calendar } from 'lucide-vue-next';

const classesStore = useClassesStore();

const emit = defineEmits<{
  'cell-click': [cell: CalendarCell];
  'class-click': [classSession: ClassSession, event: MouseEvent];
  'class-status-change': [classSession: ClassSession, status: 'pending' | 'paid' | 'cancelled'];
}>();

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function isToday(date: Date): boolean {
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

// Color de fondo según el estado: amarillo si está pendiente, verde si está pagada.
function statusClasses(status: ClassSession['status']): string {
  if (status === 'paid') return 'bg-green-100 hover:bg-green-200 border-green-300';
  return 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300';
}

function handleCellClick(cell: CalendarCell): void {
  emit('cell-click', cell);
}

function handleClassClick(classSession: ClassSession, event: MouseEvent): void {
  event.stopPropagation();
  emit('class-click', classSession, event);
}
</script>

<template>
  <div class="overflow-x-auto overflow-y-hidden rounded-xl border border-gray-200 bg-surface">
    <table class="w-full min-w-max border-collapse" role="grid" aria-label="Calendario semanal de clases">
      <thead class="sticky top-0 z-10 bg-gray-50">
        <tr>
          <th class="w-24 px-2 py-2 text-left font-semibold text-gray-600 border-r border-gray-200 border-b border-gray-200">
            <span class="sr-only">Hora</span>
            <Calendar class="w-5 h-5 mx-auto text-gray-400" />
          </th>
          <th
            v-for="(day, index) in dayNames"
            :key="index"
            :class="[
              'px-2 py-2 text-center font-semibold text-gray-700 border-b border-gray-200 border-r border-gray-200',
              isToday(classesStore.weekDays[index]) ? 'bg-primary-50 text-primary-700' : ''
            ]"
            scope="col"
          >
            <div class="flex flex-col items-center gap-1">
              <span>{{ day }}</span>
              <time :datetime="classesStore.weekDays[index].toISOString().split('T')[0]" class="text-sm font-normal text-gray-500">
                {{ classesStore.weekDays[index].getDate() }}
              </time>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, rowIndex) in classesStore.calendarGrid" :key="rowIndex">
          <!-- Columna de hora -->
          <th class="w-24 px-2 py-1 text-right text-xs text-gray-500 border-r border-gray-200 sticky left-0 bg-surface z-5" scope="row">
            <span :class="{ 'font-medium text-primary-600': row[0]?.isCurrentTime }">
              {{ row[0]?.time }}
            </span>
            <span v-if="row[0]?.isCurrentTime" class="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" aria-label="Hora actual" />
          </th>

          <!-- Celdas de días -->
          <td
            v-for="(cell, cellIndex) in row"
            :key="cellIndex"
            :class="[
              'relative p-0 align-top border-r border-gray-200 border-b border-gray-100 min-w-[130px]',
              cell.isPast ? 'bg-gray-50' : '',
              cell.isCurrentTime ? 'bg-primary-50/50' : '',
            ]"
            @click="handleCellClick(cell)"
          >
            <!-- Indicador de hora actual -->
            <div v-if="cell.isCurrentTime && cellIndex === 0" class="absolute left-0 top-0 right-0 h-0.5 bg-primary-500 z-30" aria-hidden="true" />

            <!-- Clase: ocupa cada franja de 30 min que le corresponde (nombre - asignatura en una línea) -->
            <div
              v-if="cell.class"
              :class="[
                'min-h-[60px] px-1.5 py-1 flex items-center gap-1 cursor-pointer transition-colors border-l-4',
                statusClasses(cell.class.status),
              ]"
              :title="`${cell.class.student?.full_name || 'Alumno'} - ${cell.class.subject?.name || 'Sin asignatura'}`"
              @click="handleClassClick(cell.class, $event)"
            >
              <span class="text-xs font-semibold text-gray-900 whitespace-nowrap leading-tight">
                {{ cell.class.student?.full_name || 'Alumno' }}
              </span>
              <span class="text-xs text-gray-400 whitespace-nowrap leading-tight" aria-hidden="true">-</span>
              <span class="text-xs text-gray-700 whitespace-nowrap leading-tight">
                {{ cell.class.subject?.name || 'Sin asignatura' }}
              </span>
            </div>

            <!-- Indicador visual de celda vacía clickeable -->
            <div
              v-else
              class="min-h-[60px] flex items-center justify-center"
              style="opacity: 0.03;"
            >
              <span class="text-gray-300">+</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
