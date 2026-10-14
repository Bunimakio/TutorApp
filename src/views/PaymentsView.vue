<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { usePaymentsStore } from '@/stores/payments';
import { useStudentsStore } from '@/stores/students';
import { useSubjectsStore } from '@/stores/subjects';
import { useAuthStore } from '@/stores/auth';
import {
  classAmount,
  formatCurrency,
  formatDate,
  formatLongDate,
  formatTime,
  monthLabel,
} from '@/lib/payments';
import { buildPaymentsReportHtml } from '@/lib/payments-report';
import { printHtml } from '@/lib/print';
import Card from '@/components/ui/Card.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Select from '@/components/ui/Select.vue';
import { Filter, Printer, RefreshCw, Wallet } from 'lucide-vue-next';

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
  const html = buildPaymentsReportHtml({
    classes: paymentsStore.monthClasses,
    monthLabel: monthLabel(paymentsStore.month),
    generatedAt: formatLongDate(),
    user: userLabel(),
  });

  printHtml(html);
}
</script>

<template>
  <div class="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
    <div class="max-w-5xl mx-auto space-y-8">
      <!-- Encabezado -->
      <header class="flex items-start gap-4">
        <div class="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
          <Wallet class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Pagos</h1>
          <p class="text-gray-500 mt-1">Últimos pagos y resumen de la situación del mes</p>
        </div>
      </header>

      <!-- Últimos pagos -->
      <section class="space-y-4">
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

      <Card padding="none" class="overflow-hidden">
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

      <!-- Informe del mes: solo se genera el PDF, no se muestra en la página -->
      <Card>
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
              <Printer class="w-5 h-5" />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Informe del mes</h2>
              <p class="text-gray-500 text-sm mt-0.5">
                PDF con todas las clases del mes, el total ganado, las horas y la cantidad de clases.
              </p>
            </div>
          </div>
          <div class="flex flex-wrap items-end gap-2">
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
              :icon="Printer"
              class="gap-1.5"
              :loading="paymentsStore.monthLoading"
              @click="handlePrint"
            >
              Imprimir / Guardar PDF
            </Button>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>
