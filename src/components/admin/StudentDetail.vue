<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue';
import { useStudentsStore } from '@/stores/students';
import { useClassesStore } from '@/stores/classes';
import Avatar from '@/components/ui/Avatar.vue';
import Badge from '@/components/ui/Badge.vue';
import Button from '@/components/ui/Button.vue';
import Card from '@/components/ui/Card.vue';
import { Mail, Phone, Calendar, Clock, DollarSign, BookOpen, Trash2, Edit, Eye, AlertCircle, CheckCircle, Plus, FileText, ArrowUpRight, User } from 'lucide-vue-next';

const studentsStore = useStudentsStore();
const classesStore = useClassesStore();

const props = defineProps<{
  student: any;
  stats: any;
  recentClasses: any[];
  /** Total abonado histórico por el alumno (todas las clases pagadas). */
  paidTotal?: number;
}>();

const emit = defineEmits<{
  edit: [student: any];
  delete: [studentId: string];
  viewClasses: [studentId: string];
  newClass: [student: any];
}>();

const activeTab = ref<'resumen' | 'clases' | 'pagos'>('resumen');

const totalPending = computed(() => {
  return (props.stats?.pending_amount || 0);
});

const totalPaid = computed(() => {
  // Total abonado histórico (si no está disponible, lo que informa el servidor).
  return (props.paidTotal ?? props.stats?.paid_last_30_days ?? 0);
});

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(dateStr: string, timeStr: string): string {
  return `${formatDate(dateStr)} ${timeStr}`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'paid': return { variant: 'paid' as const, icon: CheckCircle, label: 'Pagado' };
    case 'pending': return { variant: 'pending' as const, icon: AlertCircle, label: 'Pendiente' };
    case 'cancelled': return { variant: 'danger' as const, icon: Trash2, label: 'Cancelada' };
    default: return { variant: 'default' as const, icon: AlertCircle, label: status };
  }
}

function handleNewClass(): void {
  if (props.student) {
    emit('newClass', props.student);
  }
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}
</script>

<template>
  <div v-if="props.student" class="space-y-6 p-4 sm:p-6">
    <!-- Header del alumno -->
    <div class="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
      <div class="flex items-start gap-4 min-w-0">
        <Avatar :name="props.student.full_name" :size="'xl'" />
        <div class="min-w-0">
          <h2 class="text-xl sm:text-2xl font-bold text-gray-900 break-words">{{ props.student.full_name }}</h2>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
            <span v-if="props.student.email" class="flex items-center gap-1">
              <Mail class="w-4 h-4 flex-shrink-0" /> <span class="break-all">{{ props.student.email }}</span>
            </span>
            <span v-if="props.student.phone" class="flex items-center gap-1">
              <Phone class="w-4 h-4 flex-shrink-0" /> {{ props.student.phone }}
            </span>
            <span class="flex items-center gap-1">
              <Calendar class="w-4 h-4 flex-shrink-0" />
              Alumno desde {{ formatDate(props.student.created_at) }}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-wrap xl:justify-end">
        <Button variant="primary" icon="Plus" @click="handleNewClass" class="gap-1.5">Nueva clase</Button>
        <Button variant="outline" icon="Edit" @click="$emit('edit', props.student)" class="gap-1.5">Editar</Button>
        <Button variant="ghost" icon="Eye" @click="$emit('viewClasses', props.student.id)" class="gap-1.5">Ver todas</Button>
      </div>
    </div>

    <!-- Tarjetas de resumen -->
    <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <Card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Total clases</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-900">{{ props.stats?.total_classes || 0 }}</p>
          </div>
          <div class="p-3 bg-blue-100 rounded-xl text-blue-600">
            <BookOpen class="w-6 h-6" />
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Horas totales</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-900">{{ (props.stats?.total_hours || 0).toFixed(1) }}h</p>
          </div>
          <div class="p-3 bg-green-100 rounded-xl text-green-600">
            <Clock class="w-6 h-6" />
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Clases (30 días)</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-900">{{ props.stats?.classes_last_30_days || 0 }}</p>
          </div>
          <div class="p-3 bg-purple-100 rounded-xl text-purple-600">
            <Calendar class="w-6 h-6" />
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">Total abonado</p>
            <p class="text-2xl sm:text-3xl font-bold text-gray-900">{{ formatCurrency(totalPaid) }}</p>
          </div>
          <div class="p-3 bg-emerald-100 rounded-xl text-emerald-600">
            <DollarSign class="w-6 h-6" />
          </div>
        </div>
      </Card>
    </div>

    <!-- Alertas -->
    <div v-if="totalPending > 0" class="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
      <AlertCircle class="w-6 h-6 text-yellow-600 flex-shrink-0" />
      <div class="flex-1">
        <p class="font-medium text-yellow-800">Pendiente de cobro</p>
        <p class="text-sm text-yellow-700">{{ formatCurrency(totalPending) }} en clases no pagadas</p>
      </div>
    </div>
    <div v-else class="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
      <CheckCircle class="w-6 h-6 text-green-600 flex-shrink-0" />
      <div class="flex-1">
        <p class="font-medium text-green-800">Al día</p>
        <p class="text-sm text-green-700">No hay pagos pendientes</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200">
      <nav class="flex gap-4" aria-label="Pestañas de detalle">
        <button
          v-for="tab in ['resumen', 'clases', 'pagos']"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'px-3 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          ]"
          role="tab"
          :aria-selected="activeTab === tab"
        >
          {{ tab.charAt(0).toUpperCase() + tab.slice(1) }}
        </button>
      </nav>
    </div>

    <!-- Contenido de pestañas -->
    <div v-if="activeTab === 'resumen'" class="space-y-4">
      <Card class="p-4">
        <h3 class="font-semibold text-gray-900 mb-4">Últimas 5 clases</h3>
        <div v-if="props.recentClasses && props.recentClasses.length > 0" class="space-y-3">
          <div
            v-for="cls in props.recentClasses"
            :key="cls.id"
            class="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-2 h-2 rounded-full flex-shrink-0" :style="{ backgroundColor: cls.subject?.color || '#3B82F6' }" />
              <div class="min-w-0">
                <p class="font-medium text-gray-900 truncate">{{ cls.subject?.name || 'Sin asignatura' }}</p>
                <p class="text-sm text-gray-500">{{ formatDateTime(cls.date, cls.start_time) }} - {{ cls.end_time }}</p>
              </div>
            </div>
            <div class="flex items-center gap-3 flex-shrink-0">
              <Badge :variant="getStatusBadge(cls.status).variant" :dot="true" size="sm">
                <component :is="getStatusBadge(cls.status).icon" class="w-3 h-3" />
                {{ getStatusBadge(cls.status).label }}
              </Badge>
              <span class="font-medium text-gray-900">{{ formatCurrency((cls.subject?.price || 0) * (timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time)) / 60) }}</span>
            </div>
          </div>
        </div>
        <p v-else class="text-center text-gray-500 py-4">No hay clases registradas</p>
      </Card>

      <Card class="p-4">
        <h3 class="font-semibold text-gray-900 mb-4">Notas del alumno</h3>
        <p v-if="props.student.notes" class="text-gray-700 whitespace-pre-wrap">{{ props.student.notes }}</p>
        <p v-else class="text-gray-400 italic">Sin notas</p>
      </Card>
    </div>

    <div v-else-if="activeTab === 'clases'" class="space-y-4">
      <Card class="p-4">
        <h3 class="font-semibold text-gray-900 mb-4">Historial completo de clases</h3>
        <div class="overflow-x-auto">
          <table class="w-full min-w-[600px] text-sm">
            <thead>
              <tr class="text-left text-gray-500 border-b border-gray-200">
                <th class="pb-2 pr-4">Fecha</th>
                <th class="pb-2 pr-4">Hora</th>
                <th class="pb-2 pr-4">Asignatura</th>
                <th class="pb-2 pr-4">Duración</th>
                <th class="pb-2 pr-4">Precio/h</th>
                <th class="pb-2 pr-4">Total</th>
                <th class="pb-2">Estado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="cls in props.recentClasses" :key="cls.id" class="hover:bg-gray-50">
                <td class="py-3 pr-4">{{ formatDate(cls.date) }}</td>
                <td class="py-3 pr-4">{{ cls.start_time }} - {{ cls.end_time }}</td>
                <td class="py-3 pr-4">
                  <span class="inline-flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: cls.subject?.color || '#3B82F6' }" />
                    {{ cls.subject?.name || 'Sin asignatura' }}
                  </span>
                </td>
                <td class="py-3 pr-4">{{ ((timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time)) / 60).toFixed(1) }}h</td>
                <td class="py-3 pr-4">{{ formatCurrency(cls.subject?.price || 0) }}</td>
                <td class="py-3 pr-4 font-medium">{{ formatCurrency((cls.subject?.price || 0) * (timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time)) / 60) }}</td>
                <td class="py-3">
                  <Badge :variant="getStatusBadge(cls.status).variant" :dot="true" size="sm">
                    <component :is="getStatusBadge(cls.status).icon" class="w-3 h-3" />
                    {{ getStatusBadge(cls.status).label }}
                  </Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <div v-else-if="activeTab === 'pagos'" class="space-y-4">
      <Card class="p-4">
        <h3 class="font-semibold text-gray-900 mb-4">Resumen de pagos</h3>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="p-4 bg-green-50 rounded-lg">
            <p class="text-sm text-green-700">Total abonado</p>
            <p class="text-2xl font-bold text-green-900">{{ formatCurrency(totalPaid) }}</p>
          </div>
          <div class="p-4 bg-yellow-50 rounded-lg">
            <p class="text-sm text-yellow-700">Pendiente</p>
            <p class="text-2xl font-bold text-yellow-900">{{ formatCurrency(totalPending) }}</p>
          </div>
          <div class="p-4 bg-blue-50 rounded-lg">
            <p class="text-sm text-blue-700">Total facturado</p>
            <p class="text-2xl font-bold text-blue-900">{{ formatCurrency(totalPaid + totalPending) }}</p>
          </div>
        </div>
      </Card>
    </div>
  </div>

  <div v-else class="flex flex-col items-center justify-center h-64 text-gray-500">
    <User class="w-16 h-16 mb-4 text-gray-300" />
    <p class="text-lg font-medium">Selecciona un alumno</p>
    <p class="text-sm">O crea uno nuevo para ver sus detalles</p>
  </div>
</template>