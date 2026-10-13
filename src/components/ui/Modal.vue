<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

interface Props {
  modelValue: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnOverlayClick: true,
  closeOnEscape: true,
  showCloseButton: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

const modalRef = ref<HTMLDivElement>();
const focusableElements: HTMLElement[] = [];
let previousActiveElement: HTMLElement | null = null;

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.closeOnEscape) {
    close();
    return;
  }

  if (event.key === 'Tab') {
    trapFocus(event);
  }
}

function trapFocus(event: KeyboardEvent) {
  if (focusableElements.length === 0) return;

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function updateFocusableElements() {
  if (!modalRef.value) return;
  focusableElements.length = 0;
  focusableElements.push(
    ...Array.from(modalRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ))
  );
}

function close() {
  emit('update:modelValue', false);
  emit('close');
}

function handleOverlayClick(event: MouseEvent) {
  if (props.closeOnOverlayClick && event.target === event.currentTarget) {
    close();
  }
}

watch(() => props.modelValue, (open) => {
  if (open) {
    previousActiveElement = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    nextTick(() => {
      updateFocusableElements();
      focusableElements[0]?.focus();
    });
  } else {
    document.body.style.overflow = '';
    previousActiveElement?.focus();
  }
});

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
  document.body.style.overflow = '';
});

import { nextTick } from 'vue';
</script>

<template>
  <Transition name="modal">
    <div v-if="props.modelValue" class="fixed inset-0 z-50 overflow-y-auto" @click="handleOverlayClick">
      <div class="flex min-h-full items-center justify-center p-4">
        <!-- Overlay -->
        <div class="fixed inset-0 bg-black/50 transition-opacity" aria-hidden="true" />

        <!-- Modal -->
        <div
          ref="modalRef"
          :class="['relative w-full bg-surface rounded-xl shadow-xl transform transition-all', sizeClasses[props.size]]"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="props.title ? 'modal-title' : undefined"
        >
          <div class="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 v-if="props.title" id="modal-title" class="text-lg font-semibold text-gray-900">
              {{ props.title }}
            </h2>
            <button
              v-if="props.showCloseButton"
              type="button"
              @click="close"
              class="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Cerrar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="p-4">
            <slot />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(-10px);
}
.modal-content {
  transition: transform 0.2s ease;
}
</style>