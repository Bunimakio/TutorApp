<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSubjectsStore } from '@/stores/subjects';
import { useForm, validators, validateForm } from '@/composables/useForm';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import { Plus, Edit, Trash2, DollarSign, Palette, Check, X, Eye, EyeOff, BookOpen } from 'lucide-vue-next'

const subjectsStore = useSubjectsStore()

const emit = defineEmits<{
  update: [subject: any]
  delete: [subjectId: string]
}>()

const showForm = ref(false)
const editMode = ref(false)
const editingSubject = ref<any>(null)
const showColorPicker = ref(false)

const form = useForm({
  name: '',
  price: 0,
  color: '#3B82F6'
})

const validationRules = {
  name: [validators.required('Nombre obligatorio'), validators.minLength(2)],
  price: [validators.numeric(), validators.min(0, 'El precio no puede ser negativo')],
  color: [validators.required()]
}

const presetColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#EAB308', '#D946EF', '#22C55E', '#FB923C'
]

function openCreate(): void {
  editMode.value = false
  editingSubject.value = null
  form.reset()
  form.setValues({ name: '', price: 0, color: '#3B82F6' })
  showForm.value = true
}

function openEdit(subject: any): void {
  editMode.value = true
  editingSubject.value = subject
  form.setValues({
    name: subject.name,
    price: subject.price,
    color: subject.color
  })
  showForm.value = true
}

async function handleSubmit(): Promise<void> {
  const valid = await form.handleSubmit(
    async (values) => {
      if (editMode.value && editingSubject.value) {
        await subjectsStore.update(editingSubject.value.id, values)
      } else {
        await subjectsStore.create(values)
      }
      showForm.value = false
    },
    (values) => validateForm(values, validationRules)
  )
}

function handleDelete(subject: any): void {
  if (confirm(`¿Eliminar "${subject.name}"? Esta acción no se puede deshacer.`)) {
    subjectsStore.remove(subject.id)
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h2 class="text-2xl font-bold text-gray-900">Asignaturas y Precios</h2>
        <p class="text-gray-500 mt-1">Gestiona las asignaturas y su precio por hora</p>
      </div>
      <Button variant="primary" icon="Plus" @click="openCreate" class="gap-1.5 shrink-0">
        Nueva asignatura
      </Button>
    </div>

    <!-- Lista de asignaturas -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card
        v-for="subject in subjectsStore.sortedSubjects"
        :key="subject.id"
        class="p-4 flex flex-col min-w-0 overflow-hidden"
        :style="{ borderLeft: `4px solid ${subject.color}` }"
      >
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0" :style="{ backgroundColor: subject.color }">
              <BookOpen class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <h3 class="font-semibold text-gray-900 break-words">{{ subject.name }}</h3>
              <p class="text-sm text-gray-500 truncate">ID: {{ subject.id.slice(0, 8) }}...</p>
            </div>
          </div>
          <Badge class="shrink-0 whitespace-nowrap" :variant="subject.price === 0 ? 'warning' : 'success'" size="sm" :dot="true">
            <DollarSign class="w-3 h-3" />
            {{ subject.price === 0 ? 'Sin precio' : formatCurrency(subject.price) + '/h' }}
          </Badge>
        </div>

        <div class="flex-1 flex flex-wrap items-end justify-between gap-2 pt-4 border-t border-gray-100 min-w-0">
          <div class="flex items-center gap-2 text-sm text-gray-500 min-w-0">
            <span class="flex items-center gap-1 min-w-0">
              <Palette class="w-3.5 h-3.5 shrink-0" />
              <span class="font-mono truncate">{{ subject.color }}</span>
            </span>
            <div class="w-6 h-6 rounded border shrink-0" :style="{ backgroundColor: subject.color }" />
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" icon="Edit" @click="openEdit(subject)" class="p-1.5" aria-label="Editar" />
            <Button variant="ghost" size="sm" icon="Trash2" @click="handleDelete(subject)" class="p-1.5 text-red-600 hover:text-red-700" aria-label="Eliminar" />
          </div>
        </div>
      </Card>

      <!-- Tarjeta vacía para añadir -->
      <Card variant="outlined" class="p-4 flex flex-col items-center justify-center text-center border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50 transition-colors cursor-pointer" @click="openCreate">
        <Plus class="w-12 h-12 text-gray-300 mb-3" />
        <p class="text-gray-500">Añadir asignatura</p>
        <p class="text-xs text-gray-400 mt-1">{{ subjectsStore.subjects.length }} asignaturas creadas</p>
      </Card>
    </div>

    <!-- Modal formulario -->
    <Modal
      :modelValue="showForm"
      :title="editMode ? 'Editar asignatura' : 'Nueva asignatura'"
      @close="showForm = false"
      @update:modelValue="showForm = false"
    >
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <Input
          v-model="form.values.name"
          :error="form.getError('name')"
          label="Nombre"
          placeholder="Ej: Matemáticas, Física, Inglés..."
          icon="BookOpen"
        />

        <div class="grid grid-cols-2 gap-4">
          <Input
            v-model="form.values.price"
            :error="form.getError('price')"
            label="Precio por hora (€)"
            type="number"
            placeholder="25.00"
            :step="0.01"
            :min="0"
            icon="DollarSign"
          />

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div class="relative">
              <Input
                v-model="form.values.color"
                type="color"
                :error="form.getError('color')"
                class="h-12 cursor-pointer"
              />
              <button
                type="button"
                @click="showColorPicker = !showColorPicker"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Seleccionar color"
              >
                <Palette class="w-5 h-5" />
              </button>
            </div>

            <!-- Color picker -->
            <Transition name="fade">
              <div v-if="showColorPicker" class="absolute z-20 mt-2 p-2 bg-surface border border-gray-200 rounded-lg shadow-lg">
                <div class="grid grid-cols-5 gap-2">
                  <button
                    v-for="color in presetColors"
                    :key="color"
                    type="button"
                    @click="form.setValue('color', color); showColorPicker = false"
                    :class="[
                      'w-8 h-8 rounded border-2 transition-transform',
                      form.values.color === color ? 'scale-110 border-primary-500' : 'border-transparent hover:scale-105'
                    ]"
                    :style="{ backgroundColor: color }"
                    :aria-label="color"
                  />
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button type="button" variant="ghost" @click="showForm = false">Cancelar</Button>
          <Button type="submit" :loading="form.submitting" :disabled="!form.isValid">
            {{ editMode ? 'Guardar cambios' : 'Crear asignatura' }}
          </Button>
        </div>
      </form>
    </Modal>
  </div>
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