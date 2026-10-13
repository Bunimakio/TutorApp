<script setup lang="ts">
import { computed, ref } from 'vue';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  modelValue: string;
  options: Option[];
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  multiple?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Seleccionar...',
  disabled: false,
  required: false,
  searchable: false,
  clearable: false,
  multiple: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  change: [value: string];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const selectRef = ref<HTMLSelectElement>();
const focused = ref(false);
const searchQuery = ref('');

const filteredOptions = computed(() => {
  if (!props.searchable || !searchQuery.value) return props.options;
  const query = searchQuery.value.toLowerCase();
  return props.options.filter(o => o.label.toLowerCase().includes(query));
});

const selectClasses = computed(() => {
  const base = 'w-full px-3 py-2 rounded-lg border appearance-none transition-colors duration-150 text-gray-900';
  const states = props.error
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
    : focused.value
      ? 'border-primary-500 focus:ring-primary-500 focus:border-primary-500'
      : 'border-gray-300 hover:border-gray-400 focus:ring-gray-500';
  const disabled = props.disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-field';
  return `${base} ${states} ${disabled}`;
});

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  emit('update:modelValue', target.value);
  emit('change', target.value);
}

function handleBlur(event: FocusEvent) {
  focused.value = false;
  emit('blur', event);
}

function handleFocus(event: FocusEvent) {
  focused.value = true;
  emit('focus', event);
}

function clearValue() {
  emit('update:modelValue', '');
  emit('change', '');
  selectRef.value?.focus();
}
</script>

<template>
  <div class="w-full">
    <label v-if="props.label" :for="props.label.toLowerCase().replace(/\s+/g, '-')" class="block text-sm font-medium text-gray-700 mb-1">
      {{ props.label }} <span v-if="props.required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <select
        ref="selectRef"
        :id="props.label?.toLowerCase().replace(/\s+/g, '-')"
        :value="props.modelValue"
        :disabled="props.disabled"
        :required="props.required"
        :multiple="props.multiple"
        :class="selectClasses + ' pr-10'"
        @change="handleChange"
        @blur="handleBlur"
        @focus="handleFocus"
      >
        <option v-if="!props.multiple && props.placeholder" value="" disabled>
          {{ props.placeholder }}
        </option>
        <option v-for="option in filteredOptions" :key="option.value" :value="option.value" :disabled="option.disabled">
          {{ option.label }}
        </option>
      </select>
      <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <button
        v-if="props.clearable && props.modelValue && !props.disabled"
        type="button"
        @click="clearValue"
        class="absolute inset-y-0 right-0 pr-10 flex items-center text-gray-400 hover:text-gray-600"
        aria-label="Limpiar selección"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <p v-if="props.error" class="mt-1 text-sm text-red-600" role="alert">{{ props.error }}</p>
    <p v-else-if="props.hint" class="mt-1 text-sm text-gray-500">{{ props.hint }}</p>
  </div>
</template>