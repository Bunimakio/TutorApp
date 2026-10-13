<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useClassesStore } from '@/stores/classes';
import type { CalendarCell, ClassSession } from '@/types';
import { Calendar } from 'lucide-vue-next';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';

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

// ---------------------------------------------------------------------------
// CELULAR
// En pantallas chicas la semana completa no entra cómoda, así que mostramos
// UN día por vez con pestañas. El layout se decide con matchMedia (mismo
// breakpoint `md` de Tailwind: 768px) en vez de CSS, para no renderizar
// las dos versiones al mismo tiempo.
// ---------------------------------------------------------------------------
const MOBILE_QUERY = '(max-width: 767px)';
const isMobile = ref(false);
let mediaQuery: MediaQueryList | null = null;

function syncIsMobile(): void {
  isMobile.value = mediaQuery ? mediaQuery.matches : false;
}

onMounted(() => {
  mediaQuery = window.matchMedia(MOBILE_QUERY);
  syncIsMobile();
  mediaQuery.addEventListener('change', syncIsMobile);
});

onUnmounted(() => {
  mediaQuery?.removeEventListener('change', syncIsMobile);
});

const selectedDay = ref(0);

// Índice del día de hoy dentro de la semana visible (-1 si no está: otra semana o domingo)
const todayIndex = computed(() => {
  const now = new Date();
  const index = classesStore.weekDays.findIndex(day => isSameDay(day, now));
  return index >= 0 && index < 6 ? index : -1;
});

// Al cambiar de semana, abrimos en el día de hoy (si está en esa semana).
watch(
  () => classesStore.currentWeek.start.getTime(),
  () => { selectedDay.value = todayIndex.value >= 0 ? todayIndex.value : 0; },
  { immediate: true }
);

// Datos de cada pestaña: nombre, número de día, si es hoy y si tiene clases.
const dayTabs = computed(() =>
  classesStore.weekDays.slice(0, 6).map((date, index) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return {
      index,
      name: dayNames[index],
      number: date.getDate(),
      isToday: isToday(date),
      classCount: classesStore.classes.filter(
        c => c.date === dateStr && c.status !== 'cancelled'
      ).length,
    };
  })
);

interface DayRow {
  cell: CalendarCell | undefined;
  time: string;
  /** La clase empieza en esta franja: se dibuja una sola vez (no cada 30 min). */
  isClassStart: boolean;
  /** Cuántas franjas de 30 min dura la clase (para el rowspan). */
  classSpan: number;
}

const dayRows = computed<DayRow[]>(() => {
  const grid = classesStore.calendarGrid;
  return grid.map((row, rowIndex) => {
    const cell = row[selectedDay.value];
    const previous = rowIndex > 0 ? grid[rowIndex - 1][selectedDay.value] : undefined;
    const classId = cell?.class?.id ?? null;
    const isClassStart = classId !== null && previous?.class?.id !== classId;

    let classSpan = 0;
    if (isClassStart) {
      for (let i = rowIndex; i < grid.length; i++) {
        if (grid[i][selectedDay.value]?.class?.id !== classId) break;
        classSpan += 1;
      }
    }

    return { cell, time: cell?.time ?? '', isClassStart, classSpan };
  });
});

const selectedDayTitle = computed(() => {
  const date = classesStore.weekDays[selectedDay.value];
  return date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : '';
});

// Cuántas líneas de texto permitimos según lo que dura la clase (48px por franja).
function clampClass(span: number): string {
  if (span >= 3) return 'line-clamp-6';
  if (span === 2) return 'line-clamp-4';
  return 'line-clamp-2';
}

const SLOT_HEIGHT = 48; // alto de cada franja de 30 min en el celular (px)
</script>

<template>
  <!-- ==================== CELULAR: un día por vez ==================== -->
  <div v-if="isMobile" class="rounded-xl border border-gray-200 bg-surface overflow-hidden">
    <!-- Pestañas de día -->
    <div class="flex gap-1 p-1.5 border-b border-gray-200" role="tablist" aria-label="Elegir día">
      <button
        v-for="tab in dayTabs"
        :key="tab.index"
        type="button"
        role="tab"
        :aria-selected="selectedDay === tab.index"
        :aria-label="`${tab.name} ${tab.number}${tab.classCount ? `, ${tab.classCount} clases` : ''}`"
        @click="selectedDay = tab.index"
        :class="[
          'flex-1 min-w-0 rounded-lg px-1 py-1.5 transition-colors active:scale-[0.97]',
          selectedDay === tab.index
            ? 'bg-primary-500 text-white shadow-sm'
            : (tab.isToday ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-100')
        ]"
      >
        <span class="block text-[11px] font-medium uppercase leading-tight">{{ tab.name }}</span>
        <span class="block text-base font-semibold leading-tight">{{ tab.number }}</span>
        <span
          class="block mx-auto mt-0.5 h-1 w-1 rounded-full"
          :class="tab.classCount > 0
            ? (selectedDay === tab.index ? 'bg-white' : 'bg-primary-500')
            : 'bg-transparent'"
          aria-hidden="true"
        />
      </button>
    </div>

    <!-- Grilla del día elegido -->
    <p class="sr-only">{{ selectedDayTitle }}</p>
    <div class="flex">
      <!-- Columna de horas -->
      <div class="w-12 flex-none border-r border-gray-200">
        <div
          v-for="(row, rowIndex) in dayRows"
          :key="'time-' + rowIndex"
          class="h-12 flex items-center justify-end gap-1 pr-1.5 border-b border-gray-100 last:border-b-0 text-[11px] leading-none text-gray-500"
          :class="row.cell?.isCurrentTime ? 'font-semibold text-primary-600' : ''"
        >
          <span v-if="row.cell?.isCurrentTime" class="w-1 h-1 rounded-full bg-primary-500 flex-none" aria-hidden="true" />
          <span>{{ row.time }}</span>
        </div>
      </div>

      <!-- Columna del día elegido -->
      <div class="flex-1 min-w-0">
        <template v-for="(row, rowIndex) in dayRows" :key="'day-' + rowIndex">
          <!-- Clase: un solo bloque, del alto que dura -->
          <div
            v-if="row.isClassStart && row.cell?.class"
            :style="{ height: row.classSpan * SLOT_HEIGHT + 'px' }"
            :class="[
              'flex items-center px-2 border-b border-l-4 cursor-pointer transition-colors last:border-b-0',
              statusClasses(row.cell.class.status),
            ]"
            :title="`${row.cell.class.student?.full_name || 'Alumno'} - ${row.cell.class.subject?.name || 'Sin asignatura'}`"
            @click="handleClassClick(row.cell.class, $event)"
          >
            <p :class="['text-sm leading-snug text-gray-900', clampClass(row.classSpan)]">
              <span class="font-semibold">{{ row.cell.class.student?.full_name || 'Alumno' }}</span>
              <span class="text-gray-400" aria-hidden="true"> - </span>
              <span class="text-gray-700">{{ row.cell.class.subject?.name || 'Sin asignatura' }}</span>
            </p>
          </div>

          <!-- Franja libre: se toca para crear una clase ahí -->
          <div
            v-else-if="!row.cell?.class"
            class="h-12 border-b border-gray-100 cursor-pointer last:border-b-0"
            :class="[
              row.cell?.isPast ? 'bg-gray-50' : '',
              row.cell?.isCurrentTime ? 'bg-primary-50/50' : '',
            ]"
            @click="row.cell && handleCellClick(row.cell)"
          />
        </template>
      </div>
    </div>
  </div>

  <!-- ==================== ESCRITORIO: semana completa ==================== -->
  <div v-else class="overflow-x-auto overflow-y-hidden rounded-xl border border-gray-200 bg-surface">
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
