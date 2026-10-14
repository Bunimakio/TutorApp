<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { usePaymentsStore } from '@/stores/payments';
import { useStudentsStore } from '@/stores/students';
import { useSubjectsStore } from '@/stores/subjects';
import { useAuthStore } from '@/stores/auth';
import {
  classAmount,
  classHours,
  formatCurrency,
  formatDate,
  formatHours,
  formatLongDate,
  formatTime,
  monthLabel,
} from '@/lib/payments';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Select from '@/components/ui/Select.vue';
import { Filter, RefreshCw, Wallet } from 'lucide-vue-next';

const paymentsStore = usePaymentsStore();
const studentsStore = useStudentsStore();
const subjectsStore = useSubjectsStore();
const authStore = useAuthStore();

const userLabel = () => authStore.user?.email || 'Usuario';

// Opciones de los filtros (los alumnos, en orden alfabético).
const studentOptions = computed(() => [
  { value: '', label: 'Todos los alumnos' },
  ...[...studentsStore.students]
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map(s => ({ value: s.id, label: s.full_name })),
]);

const subjectOptions = computed(() => [
  { value: '', label: 'Todas las asignaturas' },
  ...subjectsStore.sortedSubjects.map(s => ({ value: s.id, label: s.name })),
]);

onMounted(async () => {
  await Promise.all([studentsStore.fetchAll(), subjectsStore.fetchAll()]);
  await Promise.all([paymentsStore.fetchRecent(), paymentsStore.fetchMonth()]);
});

// Al cambiar un filtro volvemos a pedir los últimos pagos que coincidan.
watch(
  () => paymentsStore.filters,
  () => paymentsStore.fetchRecent(),
  { deep: true }
);

// Al cambiar el mes se rehace el informe.
watch(
  () => paymentsStore.month,
  () => paymentsStore.fetchMonth()
);

function handlePrint(): void {
  window.print();
}
</script>

<template>
  <div class="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
    <div class="max-w-5xl mx-auto space-y-8">
      <!-- Encabezado -->
      <header class="no-print flex items-start gap-4">
        <div class="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
          <Wallet class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Pagos</h1>
          <p class="text-gray-500 mt-1">Últimos pagos y resumen de la situación del mes</p>
        </div>
      </header>

      <!-- Últimos pagos -->
      <section class="no-print space-y-4">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Últimos pagos</h2>
            <p class="text-sm text-gray-500">
              Las {{ paymentsStore.recent.length }} clases más recientes (pagadas y pendientes)
            </p>
          </div>
          <Button
            v-if="paymentsStore.hasFilters"
            variant="ghost"
            :icon="Filter"
            class="gap-1.5"
            @click="paymentsStore.clearFilters()"
          >
            Limpiar filtros
          </Button>
        </div>

        <!-- Filtros -->
        <Card>
          <div class="grid gap-3 sm:grid-cols-3">
            <Select
              v-model="paymentsStore.filters.studentId"
              label="Alumno"
              :options="studentOptions"
            />
            <Select
              v-model="paymentsStore.filters.subjectId"
              label="Asignatura"
              :options="subjectOptions"
            />
            <div>
              <label for="filtro-fecha" class="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input
                id="filtro-fecha"
                v-model="paymentsStore.filters.date"
                type="date"
                class="w-full px-3 py-2 rounded-lg border border-gray-300 bg-field text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div v-if="paymentsStore.hasFilters" class="mt-3 flex items-center gap-2 text-sm text-gray-500">
            <Filter class="w-4 h-4" />
            <span>Mostrando solo los pagos que coinciden con el filtro.</span>
            <button @click="paymentsStore.clearFilters()" class="text-primary-600 hover:text-primary-700 font-medium">
              Quitar filtros
            </button>
          </div>
        </Card>
      </section>

      <Card padding="none" class="no-print overflow-hidden">
        <div v-if="paymentsStore.loading" class="flex items-center gap-3 p-8 text-gray-500">
          <RefreshCw class="w-5 h-5 animate-spin" />
          Cargando pagos...
        </div>

        <p v-else-if="paymentsStore.recent.length === 0" class="p-8 text-center text-gray-500">
          {{ paymentsStore.hasFilters ? 'No hay pagos que coincidan con el filtro.' : 'Todavía no hay pagos registrados.' }}
        </p>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 bg-gray-50">
                <th class="py-3 px-4 font-medium">Fecha y hora</th>
                <th class="py-3 px-4 font-medium">Alumno</th>
                <th class="py-3 px-4 font-medium">Asignatura</th>
                <th class="py-3 px-4 font-medium text-right">Monto</th>
                <th class="py-3 px-4 font-medium">Condición</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="cls in paymentsStore.recent"
                :key="cls.id"
                class="border-b border-gray-100 last:border-b-0 hover:bg-gray-50"
              >
                <td class="py-3 px-4 whitespace-nowrap">
                  <p class="font-medium text-gray-900">{{ formatDate(cls.date) }}</p>
                  <p class="text-xs text-gray-500">{{ formatTime(cls.start_time) }} hs</p>
                </td>
                <td class="py-3 px-4 text-gray-900">{{ cls.student?.full_name || 'Alumno' }}</td>
                <td class="py-3 px-4 text-gray-700">{{ cls.subject?.name || 'Sin asignatura' }}</td>
                <td class="py-3 px-4 text-right font-medium text-gray-900 tabular-nums">
                  {{ formatCurrency(classAmount(cls)) }}
                </td>
                <td class="py-3 px-4">
                  <Badge :variant="cls.status === 'paid' ? 'paid' : 'pending'">
                    {{ cls.status === 'paid' ? 'Pagado' : 'Pendiente' }}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <!-- Informe del mes -->
      <section class="space-y-4">
        <div class="no-print flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Informe del mes</h2>
            <p class="text-gray-500 text-sm mt-1">
              Resumen de todas las clases del mes, listo para imprimir o guardar como PDF.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div>
              <label for="informe-mes" class="block text-sm font-medium text-gray-700 mb-1">Mes</label>
              <input
                id="informe-mes"
                v-model="paymentsStore.month"
                type="month"
                class="px-3 py-2 rounded-lg border border-gray-300 bg-field text-gray-900 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <Button
              icon="Printer"
              class="gap-1.5 self-end"
              :loading="paymentsStore.monthLoading"
              @click="handlePrint"
            >
              Imprimir / Guardar PDF
            </Button>
          </div>
        </div>

        <!-- Hoja del informe: es lo único que sale en la impresión -->
        <article class="print-report bg-white text-[#111827] rounded-xl border border-[#e5e7eb] shadow-sm p-6 sm:p-8">
          <header class="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary-500 pb-5 mb-6">
            <div class="flex items-center gap-3">
              <div class="w-11 h-11 rounded-xl bg-primary-500 flex items-center justify-center text-white font-bold text-lg">
                T
              </div>
              <div>
                <p class="text-xl font-bold leading-tight">TutorApp</p>
                <p class="text-sm text-[#6b7280]">Informe de pagos</p>
              </div>
            </div>
            <div class="text-sm text-[#4b5563] sm:text-right">
              <p><span class="font-semibold text-[#111827]">Período:</span> {{ monthLabel(paymentsStore.month) }}</p>
              <p><span class="font-semibold text-[#111827]">Fecha del informe:</span> {{ formatLongDate() }}</p>
              <p><span class="font-semibold text-[#111827]">Usuario:</span> {{ userLabel() }}</p>
            </div>
          </header>

          <div v-if="paymentsStore.monthLoading" class="py-6 text-center text-[#6b7280]">Cargando el informe...</div>

          <template v-else>
            <p v-if="paymentsStore.monthClasses.length === 0" class="py-6 text-center text-[#6b7280]">
              No hubo clases en {{ monthLabel(paymentsStore.month) }}.
            </p>

            <table v-else class="w-full text-sm">
              <thead>
                <tr class="bg-[#f9fafb] text-left text-xs uppercase tracking-wide text-[#6b7280]">
                  <th class="py-2 px-3 font-semibold">Fecha</th>
                  <th class="py-2 px-3 font-semibold">Hora</th>
                  <th class="py-2 px-3 font-semibold">Alumno</th>
                  <th class="py-2 px-3 font-semibold">Asignatura</th>
                  <th class="py-2 px-3 font-semibold text-right">Duración</th>
                  <th class="py-2 px-3 font-semibold text-right">Monto</th>
                  <th class="py-2 px-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="cls in paymentsStore.monthClasses"
                  :key="cls.id"
                  class="border-b border-[#e5e7eb]"
                >
                  <td class="py-2 px-3 whitespace-nowrap">{{ formatDate(cls.date) }}</td>
                  <td class="py-2 px-3 whitespace-nowrap text-[#4b5563]">{{ formatTime(cls.start_time) }}</td>
                  <td class="py-2 px-3">{{ cls.student?.full_name || 'Alumno' }}</td>
                  <td class="py-2 px-3 text-[#4b5563]">{{ cls.subject?.name || 'Sin asignatura' }}</td>
                  <td class="py-2 px-3 text-right whitespace-nowrap text-[#4b5563]">
                    {{ formatHours(classHours(cls)) }} h
                  </td>
                  <td class="py-2 px-3 text-right whitespace-nowrap font-medium tabular-nums">
                    {{ formatCurrency(classAmount(cls)) }}
                  </td>
                  <td class="py-2 px-3">
                    <span
                      class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                      :class="cls.status === 'paid'
                        ? 'bg-[#dcfce7] text-[#166534]'
                        : 'bg-[#fef3c7] text-[#92400e]'"
                    >
                      {{ cls.status === 'paid' ? 'Pagado' : 'Pendiente' }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Totales destacados -->
            <section class="mt-6 rounded-xl border border-primary-200 bg-primary-50 p-5">
              <h3 class="text-xs uppercase tracking-wide font-semibold text-primary-700 mb-3">
                Resumen del mes
              </h3>
              <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p class="text-xs text-[#6b7280]">Total ganado (cobrado)</p>
                  <p class="text-2xl font-bold text-primary-700 tabular-nums">{{ formatCurrency(paymentsStore.monthSummary.paid) }}</p>
                </div>
                <div>
                  <p class="text-xs text-[#6b7280]">Pendiente de cobro</p>
                  <p class="text-2xl font-bold text-primary-700 tabular-nums">{{ formatCurrency(paymentsStore.monthSummary.pending) }}</p>
                </div>
                <div>
                  <p class="text-xs text-[#6b7280]">Horas dictadas</p>
                  <p class="text-2xl font-bold text-primary-700">{{ formatHours(paymentsStore.monthSummary.hours) }} h</p>
                </div>
                <div>
                  <p class="text-xs text-[#6b7280]">Clases dictadas</p>
                  <p class="text-2xl font-bold text-primary-700">{{ paymentsStore.monthSummary.classes }}</p>
                </div>
              </div>
              <p class="mt-4 pt-3 border-t border-primary-200 text-sm text-primary-800">
                Total del mes (cobrado + pendiente):
                <span class="font-bold tabular-nums">{{ formatCurrency(paymentsStore.monthSummary.total) }}</span>
              </p>
            </section>
          </template>

          <footer class="mt-6 pt-4 border-t border-[#e5e7eb] text-xs text-[#9ca3af] text-center">
            TutorApp — informe generado el {{ formatLongDate() }}
          </footer>
        </article>
      </section>
    </div>
  </div>
</template>
