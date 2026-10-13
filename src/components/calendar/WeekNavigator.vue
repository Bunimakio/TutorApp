<script setup lang="ts">
import { computed } from 'vue';
import { useClassesStore } from '@/stores/classes';
import { format, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import Button from '@/components/ui/Button.vue';
import { ChevronLeft, ChevronRight, Calendar, Home } from 'lucide-vue-next';

const classesStore = useClassesStore();

const emit = defineEmits<{
  navigate: [direction: 'prev' | 'next'];
  goToToday: [];
}>();

const today = new Date();
const isCurrentWeek = computed(() =>
  classesStore.weekDays.some(day => isSameDay(day, today))
);

const weekRange = computed(() => {
  const start = format(classesStore.currentWeek.start, 'dd MMM', { locale: es });
  const end = format(classesStore.currentWeek.end, 'dd MMM yyyy', { locale: es });
  return `${start} - ${end}`;
});
</script>

<template>
  <div class="flex items-center justify-between gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-surface border-b border-gray-200">
    <div class="flex items-center gap-1 sm:gap-4 min-w-0">
      <Button
        variant="ghost"
        size="sm"
        icon="ChevronLeft"
        @click="$emit('navigate', 'prev')"
        aria-label="Semana anterior"
      />
      <div class="text-center min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate">{{ weekRange }}</p>
        <p class="hidden sm:block text-xs text-gray-500">Semana del {{ format(classesStore.currentWeek.start, 'dd/MM', { locale: es }) }}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        icon="ChevronRight"
        @click="$emit('navigate', 'next')"
        aria-label="Semana siguiente"
      />
    </div>

    <div class="flex items-center gap-2">
      <Button
        v-if="!isCurrentWeek"
        variant="outline"
        size="sm"
        icon="Home"
        @click="$emit('goToToday')"
        class="gap-1.5"
      >
        Hoy
      </Button>
    </div>
  </div>
</template>