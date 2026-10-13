<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'default' | 'outlined' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  padding: 'md',
  hover: false,
  clickable: false,
});

const classes = computed(() => {
  const variants = {
    default: 'bg-surface border border-gray-200',
    outlined: 'bg-surface border-2 border-gray-300',
    elevated: 'bg-surface shadow-lg border-none',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const interactive = (props.hover || props.clickable)
    ? 'transition-shadow duration-200 hover:shadow-md cursor-pointer'
    : '';

  return `rounded-xl ${variants[props.variant]} ${paddings[props.padding]} ${interactive}`;
});
</script>

<template>
  <div
    :class="classes"
    :role="props.clickable ? 'button' : undefined"
    :tabindex="props.clickable ? 0 : undefined"
    @keydown.enter.prevent="$emit('click', $event)"
    @click="$emit('click', $event)"
  >
    <slot />
  </div>
</template>