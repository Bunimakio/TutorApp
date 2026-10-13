<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'pending' | 'paid';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  removable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  dot: false,
  removable: false,
});

const emit = defineEmits<{
  remove: [];
}>();

const classes = computed(() => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1 text-base',
  };

  return `inline-flex items-center gap-1.5 rounded-full font-medium ${variants[props.variant]} ${sizes[props.size]}`;
});

function handleRemove(event: MouseEvent) {
  event.stopPropagation();
  emit('remove');
}
</script>

<template>
  <span :class="classes">
    <span v-if="props.dot" class="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
    <slot />
    <button
      v-if="props.removable"
      type="button"
      @click="handleRemove"
      class="ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
      aria-label="Eliminar"
    >
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </span>
</template>