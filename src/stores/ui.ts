// Store de UI global
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const sidebarOpen = ref(true);
  const mobileMenuOpen = ref(false);
  const activeView = ref<'calendar' | 'admin' | 'settings'>('calendar');
  const notifications = ref<Array<{ id: string; type: 'success' | 'error' | 'info' | 'warning'; message: string }>>([]);
  const modals = ref<Record<string, boolean>>({});

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function setSidebarOpen(open: boolean): void {
    sidebarOpen.value = open;
  }

  function toggleMobileMenu(): void {
    mobileMenuOpen.value = !mobileMenuOpen.value;
  }

  function setActiveView(view: 'calendar' | 'admin' | 'settings'): void {
    activeView.value = view;
    mobileMenuOpen.value = false;
  }

  function notify(type: 'success' | 'error' | 'info' | 'warning', message: string, duration = 3000): string {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    notifications.value.push({ id, type, message });

    setTimeout(() => {
      dismissNotification(id);
    }, duration);

    return id;
  }

  function dismissNotification(id: string): void {
    const idx = notifications.value.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifications.value.splice(idx, 1);
    }
  }

  function clearNotifications(): void {
    notifications.value = [];
  }

  function openModal(key: string): void {
    modals.value[key] = true;
  }

  function closeModal(key: string): void {
    modals.value[key] = false;
  }

  function toggleModal(key: string): void {
    modals.value[key] = !modals.value[key];
  }

  function isModalOpen(key: string): boolean {
    return !!modals.value[key];
  }

  return {
    sidebarOpen,
    mobileMenuOpen,
    activeView,
    notifications,
    modals,
    toggleSidebar,
    setSidebarOpen,
    toggleMobileMenu,
    setActiveView,
    notify,
    dismissNotification,
    clearNotifications,
    openModal,
    closeModal,
    toggleModal,
    isModalOpen,
  };
});