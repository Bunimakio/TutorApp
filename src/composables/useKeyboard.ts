// Composable para atajos de teclado
import { onMounted, onUnmounted } from 'vue';

export function useKeyboardShortcuts() {
  const shortcuts: Record<string, () => void> = {};

  function register(key: string, callback: () => void, options: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}) {
    const combo = [
      options.ctrl && 'Control',
      options.shift && 'Shift',
      options.alt && 'Alt',
      options.meta && 'Meta',
      key.toUpperCase(),
    ].filter(Boolean).join('+');

    shortcuts[combo] = callback;
  }

  function unregister(key: string, options: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}) {
    const combo = [
      options.ctrl && 'Control',
      options.shift && 'Shift',
      options.alt && 'Alt',
      options.meta && 'Meta',
      key.toUpperCase(),
    ].filter(Boolean).join('+');

    delete shortcuts[combo];
  }

  function handleKeydown(event: KeyboardEvent) {
    // Ignorar si está en un input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Permitir Escape para cerrar modales
      if (event.key !== 'Escape') return;
    }

    const combo = [
      event.ctrlKey && 'Control',
      event.shiftKey && 'Shift',
      event.altKey && 'Alt',
      event.metaKey && 'Meta',
      event.key.toUpperCase(),
    ].filter(Boolean).join('+');

    const callback = shortcuts[combo];
    if (callback) {
      event.preventDefault();
      callback();
    }
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
  });

  return { register, unregister };
}

// Atajos globales comunes
export function useGlobalShortcuts(
  onNewClass: () => void,
  onNavigateWeek: (dir: 'prev' | 'next') => void,
  onGoToToday: () => void,
  onToggleSidebar: () => void,
  onSearch: () => void
) {
  const { register } = useKeyboardShortcuts();

  onMounted(() => {
    register('n', onNewClass, { ctrl: true }); // Ctrl+N: Nueva clase
    register('f', onSearch, { ctrl: true }); // Ctrl+F: Buscar
    register('ArrowLeft', () => onNavigateWeek('prev'), { ctrl: true }); // Ctrl+Izq: Semana anterior
    register('ArrowRight', () => onNavigateWeek('next'), { ctrl: true }); // Ctrl+Der: Semana siguiente
    register('t', onGoToToday, { ctrl: true }); // Ctrl+T: Hoy
    register('b', onToggleSidebar, { ctrl: true }); // Ctrl+B: Toggle sidebar
    register('Escape', () => {
      // Cerrar modales - manejado por el store de UI
    });
  });
}