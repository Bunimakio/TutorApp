<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useStudentsStore } from '@/stores/students';
import { useUIStore } from '@/stores/ui';
import { StudentList, StudentDetail, StudentFormModal } from '@/components/admin';
import { ArrowLeft } from 'lucide-vue-next';

const studentsStore = useStudentsStore();
const uiStore = useUIStore();

const showStudentForm = ref(false);
const editingStudent = ref<any>(null);

// En pantallas pequeñas mostramos la lista O el detalle, nunca los dos a la vez.
const showMobileDetail = ref(false);

onMounted(async () => {
  await studentsStore.fetchAll();
  // Al volver a esta sección refrescamos los datos del alumno abierto (por si se
  // confirmó algún pago desde el calendario).
  if (studentsStore.selectedStudent?.id) {
    await studentsStore.fetchWithStats(studentsStore.selectedStudent.id);
  }
});

async function handleStudentSelect(student: any): Promise<void> {
  showMobileDetail.value = true;
  await studentsStore.fetchWithStats(student.id);
}

function handleBackToList(): void {
  showMobileDetail.value = false;
}

function handleNewStudent(): void {
  editingStudent.value = null;
  showStudentForm.value = true;
}

function handleEditStudent(student: any): void {
  editingStudent.value = student;
  showStudentForm.value = true;
}

async function handleStudentSubmit(data: any): Promise<void> {
  try {
    if (editingStudent.value) {
      await studentsStore.update(editingStudent.value.id, data);
    } else {
      await studentsStore.create(data);
    }
    showStudentForm.value = false;
    editingStudent.value = null;
  } catch (e) {
    // El store ya muestra una notificación de error; mantenemos el modal abierto
    console.error('[AdminView] Error al guardar alumno:', e);
  }
}

async function handleNewClassForStudent(student: any): Promise<void> {
  // Navegar al calendario con el formulario de clase abierto
  uiStore.setActiveView('calendar');
  const { useClassesStore } = await import('@/stores/classes');
  const classesStore = useClassesStore();
  classesStore.openForm('create', null, {
    day: 1,
    time: '09:00',
    date: new Date().toISOString().split('T')[0],
  });
}
</script>

<template>
  <div class="flex-1 flex flex-col min-h-0 bg-gray-50">
    <!-- Header -->
    <div class="px-6 py-4 bg-surface border-b border-gray-200">
      <h1 class="text-2xl font-bold text-gray-900">Alumnos</h1>
      <p class="text-gray-500 mt-1">Gestiona tus alumnos, sus clases y sus pagos</p>
    </div>

    <!-- Lista + detalle -->
    <div class="flex-1 flex flex-col lg:flex-row min-h-0">
      <!-- Lista: a pantalla completa en móvil, columna fija en escritorio -->
      <div
        class="flex flex-col min-w-0 min-h-0 border-b border-gray-200 lg:border-b-0 lg:border-r lg:w-[380px] xl:w-[420px] lg:shrink-0"
        :class="{ 'hidden lg:flex': showMobileDetail }"
      >
        <StudentList
          @select="handleStudentSelect"
          @create="handleNewStudent"
        />
      </div>

      <!-- Detalle: a pantalla completa en móvil, el resto del ancho en escritorio -->
      <div
        class="flex-1 flex flex-col min-w-0 min-h-0"
        :class="{ 'hidden lg:flex': !showMobileDetail }"
      >
        <!-- Volver a la lista (solo móvil) -->
        <button
          type="button"
          class="lg:hidden flex items-center gap-2 px-4 py-3 bg-surface border-b border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          @click="handleBackToList"
        >
          <ArrowLeft class="w-4 h-4" />
          Volver a la lista
        </button>

        <div class="flex-1 min-h-0 overflow-y-auto">
          <StudentDetail
            :student="studentsStore.selectedStudent"
            :stats="studentsStore.studentStats"
            :recent-classes="studentsStore.recentClasses"
            :paid-total="studentsStore.paidTotal"
            @edit="handleEditStudent"
            @new-class="handleNewClassForStudent"
            @view-classes="handleNewClassForStudent"
          />
        </div>
      </div>
    </div>

    <!-- Modal crear/editar alumno -->
    <StudentFormModal
      v-model="showStudentForm"
      :student="editingStudent"
      @submit="handleStudentSubmit"
      @close="showStudentForm = false; editingStudent = null"
    />
  </div>
</template>
