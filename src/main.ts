import { createApp } from 'vue';
import { createPinia } from 'pinia';
import router from './router';
import App from './App.vue';
import { useThemeStore } from './stores/theme';
import './style.css';
// import './registerSW'; // Deshabilitado temporalmente

console.log('🚀 [main.ts] Starting app...');

// Plugins
const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
console.log('✅ Pinia installed');

// Tema: aplica el modo claro/oscuro guardado antes de montar (evita parpadeo).
useThemeStore().init();

app.use(router);
console.log('✅ Router installed');

// Montar inmediatamente
try {
  app.mount('#app');
  console.log('✅ App mounted successfully');
} catch (e) {
  console.error('❌ Mount error:', e);
  document.getElementById('app').innerHTML = '<pre style="color:red;padding:20px">' + e.stack + '</pre>';
}