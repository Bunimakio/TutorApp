<script setup lang="ts">
import { computed, type Component } from 'vue';
import { resolveIcon } from '@/lib/icons';

interface Props {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  icon?: string | Component; // nombre lucide ("Plus") o componente
  iconRight?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
  fullWidth: false,
  iconRight: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const iconComponent = computed(() => resolveIcon(props.icon));

const classes = computed(() => {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
    outline: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-base gap-2',
    lg: 'px-6 py-3 text-lg gap-2',
  };

  return `${base} ${variants[props.variant]} ${sizes[props.size]} ${props.fullWidth ? 'w-full' : ''}`;
});
</script>

<template>
  <button
    :type="props.type"
    :class="classes"
    :disabled="props.disabled || props.loading"
    @click="$emit('click', $event)"
  >
    <span v-if="props.loading" class="flex items-center">
      <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </span>
    <slot name="icon" v-if="iconComponent && !props.loading">
      <component :is="iconComponent" class="w-4 h-4 shrink-0" aria-hidden="true" />
    </slot>
    <slot />
    <slot name="icon-right" v-if="iconComponent && props.iconRight && !props.loading">
      <component :is="iconComponent" class="w-4 h-4 shrink-0" aria-hidden="true" />
    </slot>
  </button>
</template>