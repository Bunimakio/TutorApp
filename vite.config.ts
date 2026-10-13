import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
// import { VitePWA } from 'vite-plugin-pwa'; // Deshabilitado temporalmente por compatibilidad Node.js
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // VitePWA({ ... }) // Deshabilitado temporalmente
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    host: '127.0.0.1',
    hmr: {
      host: '127.0.0.1'
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          supabase: ['@supabase/supabase-js'],
          ui: ['lucide-vue-next', '@headlessui/vue'],
          date: ['date-fns'],
        },
      },
    },
  },
  define: {
    __SW_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
});