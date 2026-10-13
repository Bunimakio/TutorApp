// Registro del Service Worker para PWA/Offline
declare const __SW_VERSION__: string;

export function registerSW(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('✅ Service Worker registrado:', registration.scope);

          // Comprobar actualizaciones
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Nueva versión disponible
                  console.log('🔄 Nueva versión disponible');
                  showUpdateNotification();
                }
              });
            }
          });
        })
        .catch(error => {
          console.warn('⚠️ Error registrando Service Worker:', error);
        });

      // Manejar mensajes del SW
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          console.log('✅ Sincronización completada desde SW');
          window.dispatchEvent(new CustomEvent('sw-sync-complete'));
        }
      });
    });
  }
}

function showUpdateNotification(): void {
  // Crear notificación toast para actualizar
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-4 right-4 z-50 bg-primary-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-in';
  toast.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
    <span>Nueva versión disponible</span>
    <button id="sw-update-btn" class="px-3 py-1 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition">Actualizar</button>
    <button id="sw-dismiss-btn" class="p-1 hover:bg-white/20 rounded">✕</button>
  `;

  document.body.appendChild(toast);

  document.getElementById('sw-update-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('sw-dismiss-btn')?.addEventListener('click', () => {
    toast.remove();
  });

  // Auto-dismiss después de 30 segundos
  setTimeout(() => toast.remove(), 30000);
}

// Verificar si hay actualización disponible al cargar
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}