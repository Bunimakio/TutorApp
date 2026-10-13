<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useClassesStore } from '@/stores/classes';
import { useStudentsStore } from '@/stores/students';
import { useSubjectsStore } from '@/stores/subjects';
import { useForm, validators, validateForm } from '@/composables/useForm';
import type { ClassFormData, ClassSession, DayOfWeek } from '@/types';
import { format, addDays, startOfWeek, parseISO, getDay } from 'date-fns';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue';
import Button from '@/components/ui/Button.vue';
import { User, Mail, Calendar, Clock, BookOpen, UserPlus, CheckCircle } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  mode: 'create' | 'edit';
  initialData?: ClassSession | null;
  preselectedCell?: { day: number; time: string; date: string } | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [data: ClassFormData];
  close: [];
}>();

const classesStore = useClassesStore();
const studentsStore = useStudentsStore();
const subjectsStore = useSubjectsStore();

const showStudentSearch = ref(false);
const selectedStudent = ref<{ id: string; full_name: string; email: string | null } | null>(null);
const studentFieldRef = ref<HTMLElement | null>(null);
const emailInputRef = ref<{ focus: () => void } | null>(null);

const form = useForm<ClassFormData>({
  student_name: '',
  student_email: '',
  subject_id: '',
  day_of_week: 1,
  start_time: '09:00',
  duration_minutes: 60,
  date: '',
  notes: '',
  paid: false,
});

const validationRules = {
  student_name: [validators.required('Nombre del alumno obligatorio'), validators.minLength(2)],
  student_email: [validators.email()],
  subject_id: [validators.required('Asignatura obligatoria')],
  day_of_week: [validators.required()],
  start_time: [validators.required('Hora de inicio obligatoria')],
  duration_minutes: [validators.required(), validators.positive()],
  date: [validators.required('Fecha obligatoria')],
};

const dayOptions = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
];

const durationOptions = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
];

const subjectOptions = computed(() =>
  subjectsStore.subjects.map(s => ({ value: s.id, label: `${s.name} (${s.price.toFixed(2)}€/h)` }))
);

// Estado del pago en el formulario.
const isPaid = computed(() => form.values.paid === true);
// Si la clase ya está pagada, el pago queda bloqueado (no se puede deshacer).
// Si está cancelada, tampoco se puede confirmar el pago.
const paymentLocked = computed(() => props.mode === 'edit' && props.initialData?.status === 'paid');
const paymentDisabled = computed(() =>
  props.mode === 'edit' && (props.initialData?.status === 'paid' || props.initialData?.status === 'cancelled')
);

// El día de la semana y la fecha van siempre juntos: al elegir un día se calcula
// su fecha dentro de la semana que se está viendo, y al editar la fecha se
// ajusta el día. Así nunca se guarda una clase con día y fecha inconsistentes.
function dateForWeekday(baseDateStr: string | undefined, weekday: number): string {
  const base = baseDateStr ? parseISO(baseDateStr) : classesStore.currentWeek.start;
  const monday = startOfWeek(base, { weekStartsOn: 1 });
  return format(addDays(monday, weekday - 1), 'yyyy-MM-dd');
}

const selectedDay = computed<number>({
  get: () => Number(form.values.day_of_week) || 1,
  set: (day) => {
    const weekday = Number(day) || 1;
    form.setValue('day_of_week', weekday as DayOfWeek);
    form.setValue('date', dateForWeekday(form.values.date, weekday));
  },
});

// Si se edita la fecha a mano, el día de la semana se ajusta solo.
watch(() => form.values.date, (dateStr) => {
  if (!dateStr) return;
  const weekday = getDay(parseISO(dateStr)); // 0 = domingo
  if (weekday >= 1 && weekday <= 6 && Number(form.values.day_of_week) !== weekday) {
    form.setValue('day_of_week', weekday as DayOfWeek);
  }
});

// Filtra alumnos por nombre (o email) a medida que se escribe. Si no hay texto,
// muestra los primeros alumnos para poder elegir sin escribir.
const filteredStudents = computed(() => {
  const query = form.values.student_name.trim().toLowerCase();
  const all = studentsStore.students;
  const matches = query
    ? all.filter(s => s.full_name.toLowerCase().includes(query) || s.email?.toLowerCase().includes(query))
    : all;
  return matches.slice(0, 8);
});

watch(() => props.modelValue, async (open) => {
  if (open) {
    resetForm();
    populateForm();
    // Asegura que la lista de alumnos esté disponible para el buscador.
    await studentsStore.fetchAll();
  } else {
    resetForm();
  }
});

// Si el usuario cambia el nombre a mano, dejamos de considerar al alumno seleccionado.
watch(() => form.values.student_name, (val) => {
  if (selectedStudent.value && val !== selectedStudent.value.full_name) {
    selectedStudent.value = null;
    form.setValue('student_email', '');
  }
});

watch(() => props.initialData, (data) => {
  if (props.modelValue && data) {
    populateForm();
  }
}, { deep: true });

function handleClickOutside(event: MouseEvent): void {
  if (!showStudentSearch.value) return;
  if (studentFieldRef.value && !studentFieldRef.value.contains(event.target as Node)) {
    showStudentSearch.value = false;
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));

function resetForm(): void {
  form.reset();
  form.setValues({
    student_name: '',
    student_email: '',
    subject_id: subjectsStore.defaultSubject?.id || '',
    day_of_week: 1,
    start_time: '09:00',
    duration_minutes: 60,
    date: '',
    notes: '',
    paid: false,
  });
  selectedStudent.value = null;
  showStudentSearch.value = false;
}

function populateForm(): void {
  if (props.mode === 'edit' && props.initialData) {
    const c = props.initialData;
    const duration = timeToMinutes(c.end_time) - timeToMinutes(c.start_time);

    form.setValues({
      student_name: c.student?.full_name || '',
      student_email: c.student?.email || '',
      subject_id: c.subject_id,
      day_of_week: c.day_of_week,
      start_time: c.start_time,
      duration_minutes: duration as 30 | 60 | 90 | 120,
      date: c.date,
      notes: c.notes || '',
      paid: c.status === 'paid',
    });

    selectedStudent.value = c.student ? {
      id: c.student.id,
      full_name: c.student.full_name,
      email: c.student.email,
    } : null;
  } else if (props.preselectedCell) {
    form.setValue('day_of_week', props.preselectedCell.day);
    form.setValue('start_time', props.preselectedCell.time);
    form.setValue('date', props.preselectedCell.date);
    form.setValue('subject_id', subjectsStore.defaultSubject?.id || '');
  } else {
    // Default to today
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // Domingo = 7, pero solo 1-6
    if (dayOfWeek <= 6) {
      form.setValue('day_of_week', dayOfWeek as 1|2|3|4|5|6);
      form.setValue('date', today.toISOString().split('T')[0]);
    }
    form.setValue('subject_id', subjectsStore.defaultSubject?.id || '');
  }
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function selectStudent(student: { id: string; full_name: string; email: string | null }): void {
  selectedStudent.value = student;
  form.setValue('student_name', student.full_name);
  // Autocompleta el email si está disponible; si no, queda en blanco.
  form.setValue('student_email', student.email || '');
  showStudentSearch.value = false;
}

// "Agregar nuevo alumno": conserva el nombre escrito (se usará para crear el
// alumno al guardar la clase) y lleva el foco al email para completarlo.
function createNewStudent(): void {
  showStudentSearch.value = false;
  selectedStudent.value = null;
  nextTick(() => emailInputRef.value?.focus());
}

function clearSelectedStudent(): void {
  selectedStudent.value = null;
  form.setValue('student_name', '');
  form.setValue('student_email', '');
}

async function handleSubmit(): Promise<void> {
  const valid = await form.handleSubmit(
    async (values) => {
      // Validar conflictos
      const endTime = addMinutes(values.start_time, values.duration_minutes);
      const hasConflict = await classesStore.checkConflict(
        values.day_of_week,
        values.start_time,
        endTime,
        values.date,
        props.mode === 'edit' ? props.initialData?.id : undefined
      );

      if (hasConflict) {
        form.setError('start_time', 'Ya existe una clase en ese horario');
        return;
      }

      emit('submit', values);
    },
    (values) => validateForm(values, validationRules)
  );
}

function addMinutes(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(h, m + minutes, 0, 0);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

function handleClose(): void {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<template>
  <Modal
    :modelValue="props.modelValue"
    :title="props.mode === 'create' ? 'Nueva Clase' : 'Editar Clase'"
    :size="'lg'"
    @close="handleClose"
    @update:modelValue="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <!-- Alumno -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Alumno <span class="text-red-500">*</span>
        </label>
        <div ref="studentFieldRef" class="relative">
          <Input
            v-model="form.values.student_name"
            :error="form.getError('student_name')"
            placeholder="Buscar o escribir nombre del alumno..."
            @focus="showStudentSearch = true"
            @keydown.esc="showStudentSearch = false"
          />

          <!-- Resultados de búsqueda -->
          <Transition name="fade">
            <div
              v-if="showStudentSearch"
              class="absolute z-20 left-0 right-0 mt-1 bg-surface border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
            >
              <!-- Agregar nuevo alumno (siempre primero) -->
              <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 text-left text-primary-600 font-medium hover:bg-primary-50 border-b border-gray-100"
                @click="createNewStudent"
              >
                <UserPlus class="w-4 h-4 flex-shrink-0" />
                <span class="truncate">
                  Agregar nuevo alumno<template v-if="form.values.student_name">: "{{ form.values.student_name }}"</template>
                </span>
              </button>

              <!-- Alumnos que coinciden -->
              <button
                v-for="student in filteredStudents"
                :key="student.id"
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                @click="selectStudent(student)"
              >
                <User class="w-4 h-4 flex-shrink-0 text-gray-400" />
                <span class="min-w-0">
                  <span class="block font-medium text-gray-900 truncate">{{ student.full_name }}</span>
                  <span v-if="student.email" class="block text-sm text-gray-500 truncate">{{ student.email }}</span>
                </span>
              </button>

              <!-- Sin resultados -->
              <div v-if="filteredStudents.length === 0" class="px-3 py-3 text-sm text-center text-gray-500">
                No se encontraron alumnos<template v-if="form.values.student_name"> para "{{ form.values.student_name }}"</template>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Alumno seleccionado -->
        <div v-if="selectedStudent" class="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <div class="flex items-center gap-2">
            <User class="w-5 h-5 text-green-600" />
            <div>
              <p class="font-medium text-green-800">{{ selectedStudent.full_name }}</p>
              <p v-if="selectedStudent.email" class="text-sm text-green-600">{{ selectedStudent.email }}</p>
            </div>
          </div>
          <button type="button" @click="clearSelectedStudent" class="text-green-600 hover:text-green-800 text-sm">Cambiar</button>
        </div>

        <!-- Aviso de alumno nuevo (cuando se escribe un nombre sin seleccionar) -->
        <p
          v-else-if="form.values.student_name && !showStudentSearch"
          class="mt-2 text-sm text-gray-500"
        >
          Se creará un alumno nuevo con ese nombre.
        </p>
      </div>

      <!-- Email (opcional, se autocompleta) -->
      <Input
        ref="emailInputRef"
        v-model="form.values.student_email"
        :error="form.getError('student_email')"
        label="Email del alumno"
        placeholder="email@ejemplo.com"
        icon="Mail"
        type="email"
      />

      <!-- Asignatura -->
      <Select
        v-model="form.values.subject_id"
        :options="subjectOptions"
        :error="form.getError('subject_id')"
        label="Asignatura"
        placeholder="Seleccionar asignatura"
        icon="BookOpen"
        clearable
      />

      <!-- Día y Hora en fila -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          v-model="selectedDay"
          :options="dayOptions"
          :error="form.getError('day_of_week')"
          label="Día de la semana"
          icon="Calendar"
        />

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hora de inicio <span class="text-red-500">*</span></label>
          <div class="relative">
            <Input
              v-model="form.values.start_time"
              :error="form.getError('start_time')"
              type="time"
              icon="Clock"
              class="pr-10"
            />
          </div>
        </div>
      </div>

      <!-- Duración y Fecha -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          v-model="form.values.duration_minutes"
          :options="durationOptions"
          :error="form.getError('duration_minutes')"
          label="Duración"
          icon="Clock"
        />

        <Input
          v-model="form.values.date"
          :error="form.getError('date')"
          type="date"
          label="Fecha de la clase"
          icon="Calendar"
        />
      </div>

      <!-- Pago (confirmar el pago es definitivo, no se puede deshacer) -->
      <div
        class="rounded-lg border p-3"
        :class="isPaid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'"
      >
        <label class="flex items-start gap-3" :class="paymentDisabled ? 'cursor-default' : 'cursor-pointer'">
          <input
            v-model="form.values.paid"
            type="checkbox"
            :disabled="paymentDisabled"
            class="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-60"
          />
          <span class="min-w-0">
            <span class="flex items-center gap-1.5 text-sm font-medium" :class="isPaid ? 'text-green-800' : 'text-gray-900'">
              <CheckCircle v-if="isPaid" class="w-4 h-4 flex-shrink-0 text-green-600" />
              Abonado (pago confirmado)
            </span>
            <span class="block text-xs text-gray-500 mt-0.5">
              <template v-if="paymentLocked">
                El pago de esta clase ya está confirmado y no se puede deshacer.
              </template>
              <template v-else-if="paymentDisabled">
                La clase está cancelada, no se puede confirmar el pago.
              </template>
              <template v-else>
                Marcá esta casilla cuando el alumno pague. Una vez guardada no se puede deshacer.
              </template>
            </span>
          </span>
        </label>
      </div>

      <!-- Notas -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
        <textarea
          v-model="form.values.notes"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400 resize-none"
          placeholder="Notas adicionales sobre la clase..."
        />
      </div>

      <!-- Botones -->
      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="ghost" @click="handleClose">Cancelar</Button>
        <Button
          type="submit"
          :loading="form.submitting"
          :disabled="!form.isValid"
        >
          {{ props.mode === 'create' ? 'Crear clase' : 'Guardar cambios' }}
        </Button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
