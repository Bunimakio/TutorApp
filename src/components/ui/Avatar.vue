<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  shape?: 'circle' | 'square';
  status?: 'online' | 'offline' | 'busy' | 'away';
  clickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  shape: 'circle',
  clickable: false,
});

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const classes = computed(() => {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-lg',
  };

  const interactive = props.clickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  return `inline-flex items-center justify-center bg-gray-200 text-gray-600 font-medium overflow-hidden ${sizes[props.size]} ${shapes[props.shape]} ${interactive}`;
});

const statusClasses = computed(() => {
  const sizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const colors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  };

  return `absolute bottom-0 right-0 border-2 border-white ${sizes[props.size]} ${colors[props.status || 'offline']} rounded-full`;
});

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500',
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
    'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
</script>

<template>
  <div :class="classes" @click="$emit('click', $event)">
    <img
      v-if="props.src"
      :src="props.src"
      :alt="props.alt || props.name || 'Avatar'"
      class="w-full h-full object-cover"
    />
    <span v-else-if="props.name" :class="getColorFromName(props.name)">
      {{ getInitials(props.name) }}
    </span>
    <span v-else class="text-gray-400">
      <svg class="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    </span>

    <span v-if="props.status" :class="statusClasses" aria-label="Estado" />
  </div>
</template>