<script setup lang="ts">
import { computed, ref, type Component } from 'vue';
import { resolveIcon } from '@/lib/icons';

interface Props {
  modelValue: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  required?: boolean;
  autocomplete?: string;
  icon?: string | Component; // nombre lucide ("Mail") o componente
  iconRight?: string | Component;
  maxLength?: number;
  min?: number;
  max?: number;
  step?: number;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  required: false,
  autocomplete: 'off',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
  keydown: [event: KeyboardEvent];
}>();

const inputRef = ref<HTMLInputElement>();
const focused = ref(false);

const resolvedIcon = computed(() => resolveIcon(props.icon));
const resolvedIconRight = computed(() => resolveIcon(props.iconRight));

const inputClasses = computed(() => {
  const base = 'w-full py-2 rounded-lg border transition-colors duration-150 text-gray-900 placeholder-gray-400';
  const states = props.error
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
    : focused.value
      ? 'border-primary-500 focus:ring-primary-500 focus:border-primary-500'
      : 'border-gray-300 hover:border-gray-400 focus:ring-gray-500';
  const disabled = props.disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-field';
  const padding = `${resolvedIcon.value ? 'pl-10' : 'pl-3'} ${resolvedIconRight.value ? 'pr-10' : 'pr-3'}`;
  return `${base} ${padding} ${states} ${disabled}`;
});

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.value);
}

function handleBlur(event: FocusEvent) {
  focused.value = false;
  emit('blur', event);
}

function handleFocus(event: FocusEvent) {
  focused.value = true;
  emit('focus', event);
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event);
}

defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>

<template>
  <div class="w-full">
    <label v-if="props.label" :for="props.label.toLowerCase().replace(/\s+/g, '-')" class="block text-sm font-medium text-gray-700 mb-1">
      {{ props.label }} <span v-if="props.required" class="text-red-500">*</span>
    </label>
    <div class="relative">
      <input
        ref="inputRef"
        :id="props.label?.toLowerCase().replace(/\s+/g, '-')"
        :type="props.type"
        :value="props.modelValue"
        :placeholder="props.placeholder"
        :disabled="props.disabled"
        :required="props.required"
        :autocomplete="props.autocomplete"
        :maxlength="props.maxLength"
        :min="props.min"
        :max="props.max"
        :step="props.step"
        :class="inputClasses"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
        @keydown="handleKeydown"
      />
      <div v-if="resolvedIcon" class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        <component :is="resolvedIcon" class="w-5 h-5" aria-hidden="true" />
      </div>
      <div v-if="resolvedIconRight" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
        <component :is="resolvedIconRight" class="w-5 h-5" aria-hidden="true" />
      </div>
    </div>
    <p v-if="props.error" class="mt-1 text-sm text-red-600" role="alert">{{ props.error }}</p>
    <p v-else-if="props.hint" class="mt-1 text-sm text-gray-500">{{ props.hint }}</p>
    <p v-if="props.maxLength && !props.error && !props.hint" class="mt-1 text-sm text-gray-400 text-right">
      {{ props.modelValue.length }}/{{ props.maxLength }}
    </p>
  </div>
</template>