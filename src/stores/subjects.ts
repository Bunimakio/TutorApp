// Store de asignaturas (subjects)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, getCurrentUserId } from '@/lib/supabase';
import { offlineSubjects } from '@/lib/indexeddb';
import { syncService } from '@/lib/sync';
import type { Subject } from '@/types';
import { toPlain } from '@/lib/plain';

export const useSubjectsStore = defineStore('subjects', () => {
  const subjects = ref<Subject[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const sortedSubjects = computed(() =>
    [...subjects.value].sort((a, b) => a.name.localeCompare(b.name))
  );

  const defaultSubject = computed(() =>
    subjects.value.find(s => s.price === 0) || subjects.value[0] || null
  );

  async function fetchAll(forceRefresh = false): Promise<void> {
    if (subjects.value.length > 0 && !forceRefresh) return;

    loading.value = true;
    error.value = null;
    try {
      // Intentar obtener del servidor primero
      const { data, error: err } = await db.subjects.getAll();
      if (err) throw err;

      if (data) {
        subjects.value = data.map(s => ({ ...s, _synced: true }));
        // Guardar en offline sin que un fallo de caché descarte los datos del servidor.
        try {
          for (const s of subjects.value) {
            await offlineSubjects.put(toPlain(s));
          }
        } catch (cacheErr) {
          console.warn('No se pudo cachear asignaturas en IndexedDB:', cacheErr);
        }
      } else {
        // Fallback a offline
        const offline = await offlineSubjects.getAll();
        subjects.value = offline;
      }
    } catch (e) {
      console.warn('Error fetching subjects, using offline:', e);
      const offline = await offlineSubjects.getAll();
      subjects.value = offline;
      error.value = e instanceof Error ? e.message : 'Error al cargar asignaturas';
    } finally {
      loading.value = false;
    }
  }

  async function create(subject: Omit<Subject, 'id' | 'created_at' | 'updated_at' | '_synced'>): Promise<Subject | null> {
    loading.value = true;
    error.value = null;
    try {
      const user = await getCurrentUserId();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error: err } = await db.subjects.create({
        ...subject,
        user_id: user,
      } as any);

      if (err) throw err;

      const newSubject = { ...data, _synced: true } as Subject;
      subjects.value.push(newSubject);
      await offlineSubjects.put(newSubject);
      return newSubject;
    } catch (e) {
      // Offline: guardar localmente y encolar sync
      const tempId = `temp_${Date.now()}`;
      const newSubject: Subject = {
        ...subject,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _synced: false,
      };
      subjects.value.push(newSubject);
      await offlineSubjects.put(newSubject);
      await syncService.queueCreate('subject', newSubject);
      error.value = e instanceof Error ? e.message : 'Error al crear asignatura';
      return newSubject;
    } finally {
      loading.value = false;
    }
  }

  async function update(id: string, updates: Partial<Subject>): Promise<Subject | null> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await db.subjects.update(id, updates);
      if (err) throw err;

      const updated = { ...data, _synced: true } as Subject;
      const idx = subjects.value.findIndex(s => s.id === id);
      if (idx !== -1) {
        subjects.value[idx] = updated;
      }
      await offlineSubjects.put(updated);
      return updated;
    } catch (e) {
      // Offline
      const idx = subjects.value.findIndex(s => s.id === id);
      if (idx !== -1) {
        const updated = { ...subjects.value[idx], ...updates, updated_at: new Date().toISOString(), _synced: false };
        subjects.value[idx] = updated;
        await offlineSubjects.put(updated);
        await syncService.queueUpdate('subject', updated);
      }
      error.value = e instanceof Error ? e.message : 'Error al actualizar asignatura';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function remove(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const { error: err } = await db.subjects.delete(id);
      if (err) throw err;

      subjects.value = subjects.value.filter(s => s.id !== id);
      await offlineSubjects.delete(id);
      return true;
    } catch (e) {
      // Offline
      subjects.value = subjects.value.filter(s => s.id !== id);
      await offlineSubjects.delete(id);
      await syncService.queueDelete('subject', id);
      error.value = e instanceof Error ? e.message : 'Error al eliminar asignatura';
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function setDefaultPrice(price: number): Promise<void> {
    const subj = defaultSubject.value;
    if (subj) {
      await update(subj.id, { price });
    }
  }

  return {
    subjects,
    sortedSubjects,
    defaultSubject,
    loading,
    error,
    fetchAll,
    create,
    update,
    remove,
    setDefaultPrice,
  };
});