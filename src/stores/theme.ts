// Store del tema: modo claro / oscuro.
// El modo oscuro se activa agregando la clase `dark` en <html>; los colores
// salen de las variables CSS definidas en src/style.css (Tailwind darkMode: 'class').
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'tutorapp-theme';

function storedMode(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // localStorage puede no estar disponible; usamos claro.
  }
  return 'light';
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(storedMode());
  const isDark = computed(() => mode.value === 'dark');

  function applyMode(value: ThemeMode): void {
    const root = document.documentElement;
    root.classList.toggle('dark', value === 'dark');
    // `color-scheme` hace que los controles nativos (select, date, checkbox)
    // también se vean en oscuro.
    root.style.colorScheme = value;
  }

  /** Aplica el modo guardado. Se llama una vez al iniciar la app. */
  function init(): void {
    applyMode(mode.value);
  }

  function setMode(value: ThemeMode): void {
    mode.value = value;
    applyMode(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // sin persistencia, pero el modo igual se aplica en esta sesión.
    }
  }

  function toggle(): void {
    setMode(mode.value === 'dark' ? 'light' : 'dark');
  }

  return { mode, isDark, init, setMode, toggle };
});
