// Store de autenticación
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { supabase, auth } from '@/lib/supabase';
import { startAutoSync, stopAutoSync } from '@/lib/sync';
import { initOfflineDB } from '@/lib/indexeddb';
import type { User } from '@supabase/supabase-js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const session = ref<unknown>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);

  async function initialize(): Promise<void> {
    loading.value = true;
    try {
      // Inicializar IndexedDB
      await initOfflineDB();

      // Verificar si Supabase está configurado
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const isSupabaseConfigured = supabaseUrl && supabaseKey && 
        !supabaseUrl.includes('tu-proyecto') && 
        !supabaseKey.includes('tu-anon-key');

      if (isSupabaseConfigured) {
        // Obtener sesión actual
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        session.value = currentSession;
        user.value = currentSession?.user ?? null;

        // Escuchar cambios de auth
        supabase.auth.onAuthStateChange((_event, newSession) => {
          session.value = newSession;
          user.value = newSession?.user ?? null;

          if (newSession?.user) {
            startAutoSync();
          } else {
            stopAutoSync();
          }
        });

        if (user.value) {
          startAutoSync();
        }
      } else {
        console.warn('⚠️ Supabase no configurado - modo offline/demo');
        // Modo demo: crear usuario falso para testing
        user.value = { id: 'demo-user', email: 'demo@local' } as any;
        session.value = { user: user.value };
      }
    } catch (e) {
      console.error('Auth init error:', e);
      error.value = e instanceof Error ? e.message : 'Error de inicialización';
      // No bloquear la app
      user.value = { id: 'demo-user', email: 'demo@local' } as any;
    } finally {
      loading.value = false;
    }
  }

  async function signUp(email: string, password: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { error: err } = await auth.signUp(email, password);
      if (err) throw err;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al registrarse';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function signIn(email: string, password: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { error: err } = await auth.signIn(email, password);
      if (err) throw err;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al iniciar sesión';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function signOut(): Promise<void> {
    try {
      stopAutoSync();
      await auth.signOut();
      user.value = null;
      session.value = null;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al cerrar sesión';
    }
  }

  async function resetPassword(email: string): Promise<void> {
    error.value = null;
    try {
      const { error: err } = await auth.resetPassword(email);
      if (err) throw err;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al enviar email de recuperación';
      throw e;
    }
  }

  async function updatePassword(password: string): Promise<void> {
    error.value = null;
    try {
      const { error: err } = await auth.updatePassword(password);
      if (err) throw err;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Error al actualizar contraseña';
      throw e;
    }
  }

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    initialize,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };
});