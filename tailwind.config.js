/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  // El modo oscuro se activa con la clase `dark` en <html> (la maneja src/stores/theme.ts).
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // La escala de grises se define con variables CSS para poder invertirla
        // en modo oscuro: gray-50 (fondo) pasa a casi negro y gray-900 (texto)
        // a casi blanco. Los valores están en src/style.css.
        gray: {
          50: 'rgb(var(--gray-50) / <alpha-value>)',
          100: 'rgb(var(--gray-100) / <alpha-value>)',
          200: 'rgb(var(--gray-200) / <alpha-value>)',
          300: 'rgb(var(--gray-300) / <alpha-value>)',
          400: 'rgb(var(--gray-400) / <alpha-value>)',
          500: 'rgb(var(--gray-500) / <alpha-value>)',
          600: 'rgb(var(--gray-600) / <alpha-value>)',
          700: 'rgb(var(--gray-700) / <alpha-value>)',
          800: 'rgb(var(--gray-800) / <alpha-value>)',
          900: 'rgb(var(--gray-900) / <alpha-value>)',
          950: 'rgb(var(--gray-950) / <alpha-value>)',
        },
        // Superficies: tarjetas, paneles, modales y campos de formulario.
        // Son blancos en modo claro y grises oscuros en modo oscuro
        // (ver src/style.css). Se usan como `bg-surface` y `bg-field`.
        surface: 'rgb(var(--surface) / <alpha-value>)',
        field: 'rgb(var(--field) / <alpha-value>)',
        // El color principal también usa variables: en modo oscuro es verde.
        primary: {
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
        },
        pending: '#fef08a',
        paid: '#86efac',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}