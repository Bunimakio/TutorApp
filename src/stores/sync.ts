// Store de sincronización y estado offline
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { syncService } from '@/lib/sync';
import { offlineMeta } from '@/lib/indexeddb';

export const useSyncStore = defineStore('sync', () => {
  const isOnline = ref(true);
  const isSyncing = ref(false);
  const pendingCount = ref(0);
  const lastSyncTime = ref<number | null>(null);
  const syncError = ref<string | null>(null);
  let unsubscribe: (() => void) | null = null;

  const statusText = computed(() => {
    if (!isOnline.value) return 'Sin conexión';
    if (isSyncing.value) return 'Sincronizando...';
    if (pendingCount.value > 0) return `${pendingCount.value} pendientes`;
    if (lastSyncTime.value) {
      const date = new Date(lastSyncTime.value);
      return `Sincronizado: ${date.toLocaleTimeString()}`;
    }
    return 'Sincronizado';
  });

  const statusColor = computed(() => {
    if (!isOnline.value) return 'text-orange-500';
    if (isSyncing.value) return 'text-blue-500';
    if (pendingCount.value > 0) return 'text-yellow-500';
    return 'text-green-500';
  });

  async function initialize(): Promise<void> {
    // Cargar última sincronización
    lastSyncTime.value = await offlineMeta.getLastSync('full');

    // Suscribirse a cambios de la cola
    unsubscribe = syncService.subscribe(({ isSyncing: syncing, pending }) => {
      isSyncing.value = syncing;
      pendingCount.value = pending;
    });

    // Verificar conectividad inicial
    await checkConnectivity();

    // Verificar conectividad cada 30 segundos
    setInterval(checkConnectivity, 30000);
  }

  async function checkConnectivity(): Promise<boolean> {
    const online = await syncService.checkOnline();
    isOnline.value = online;
    return online;
  }

  async function forceSync(): Promise<void> {
    if (!isOnline.value) {
      syncError.value = 'Sin conexión a internet';
      return;
    }

    syncError.value = null;
    const result = await syncService.syncAll();

    if (result.failed > 0) {
      syncError.value = `${result.failed} elementos fallaron al sincronizar`;
    } else {
      lastSyncTime.value = await offlineMeta.getLastSync('full');
      syncError.value = null;
    }
  }

  async function retryFailed(): Promise<void> {
    // La cola ya reintenta automáticamente, esto fuerza un sync
    await forceSync();
  }

  function destroy(): void {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  return {
    isOnline,
    isSyncing,
    pendingCount,
    lastSyncTime,
    syncError,
    statusText,
    statusColor,
    initialize,
    checkConnectivity,
    forceSync,
    retryFailed,
    destroy,
  };
});