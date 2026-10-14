<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useForm, validators, validateForm } from '@/composables/useForm';
import Modal from '@/components/ui/Modal.vue';
import Input from '@/components/ui/Input.vue';
import Button from '@/components/ui/Button.vue';
import { User, Mail, Phone, Save, X, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: boolean;
  student: any | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [data: any];
  close: [];
}>();

const form = useForm({
  full_name: '',
  email: '',
  phone: '',
  notes: '',
  notify_email: true,
});

const validationRules = {
  full_name: [validators.required('Nombre completo obligatorio'), validators.minLength(2)],
  email: [validators.email()],
};

// Formatea el teléfono automáticamente mientras se escribe:
// el usuario solo escribe números y el formulario los agrupa.
function formatPhone(value: string): string {
  if (!value) return '';
  const hasPlus = value.trim().startsWith('+');
  const digits = value.replace(/\D/g, '');
  if (!digits) return hasPlus ? '+' : '';

  // Si sobran más de 9 dígitos, los primeros se toman como prefijo de país
  let countryCode = '';
  let local = digits;
  if (digits.length > 9) {
    countryCode = digits.slice(0, digits.length - 9) + ' ';
    local = digits.slice(-9);
  }
  const grouped = (local.match(/.{1,3}/g) || []).join(' ');
  return (hasPlus ? '+' : '') + countryCode + grouped;
}

// El teléfono se formatea solo al escribir
watch(() => form.values.phone, (val) => {
  const formatted = formatPhone(val);
  if (formatted !== val) form.values.phone = formatted;
});

watch(() => props.student, (student) => {
  if (student) {
    form.setValues({
      full_name: student.full_name || '',
      email: student.email || '',
      phone: student.phone || '',
      notes: student.notes || '',
      notify_email: student.notify_email !== false,
    });
  } else {
    form.reset();
  }
}, { immediate: true, deep: true });

watch(() => props.modelValue, (open) => {
  if (!open) {
    form.reset();
  }
});

async function handleSubmit(): Promise<void> {
  await form.handleSubmit(
    async (values) => {
      emit('submit', values);
    },
    (values) => validateForm(values, validationRules)
  );
}

function handleClose(): void {
  emit('update:modelValue', false);
  emit('close');
}
</script>

<template>
  <Modal
    :modelValue="props.modelValue"
    :title="props.student ? 'Editar alumno' : 'Nuevo alumno'"
    :size="'md'"
    @close="handleClose"
    @update:modelValue="handleClose"
  >
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <Input
        v-model="form.values.full_name"
        :error="form.getError('full_name')"
        label="Nombre completo"
        placeholder="Juan Pérez García"
        icon="User"
      />

      <Input
        v-model="form.values.email"
        :error="form.getError('email')"
        label="Email"
        placeholder="juan@ejemplo.com"
        type="email"
        icon="Mail"
      />

      <Input
        v-model="form.values.phone"
        :error="form.getError('phone')"
        label="Teléfono"
        placeholder="+34 600 000 000"
        type="tel"
        icon="Phone"
      />

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
        <textarea
          v-model="form.values.notes"
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400 resize-none"
          placeholder="Notas adicionales..."
        />
      </div>

      <label
        class="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <input
          type="checkbox"
          v-model="form.values.notify_email"
          class="mt-0.5 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
        <div>
          <span class="block text-sm font-medium text-gray-900">Recibe correos</span>
          <span class="block text-xs text-gray-500 mt-0.5">Recordatorios de clase y avisos (se respeta si pidió no recibirlos)</span>
        </div>
      </label>

      <div class="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="ghost" @click="handleClose">Cancelar</Button>
        <Button
          type="submit"
          :loading="form.submitting"
          :disabled="!form.isValid"
        >
          <Save class="w-4 h-4" />
          {{ props.student ? 'Guardar cambios' : 'Crear alumno' }}
        </Button>
      </div>
    </form>
  </Modal>
</template>