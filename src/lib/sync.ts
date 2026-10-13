// Servicio de sincronización offline -> online

import { supabase } from './supabase';
import { offlineClasses, offlineStudents, offlineSubjects, syncQueue, offlineMeta } from './indexeddb';
import type { ClassSession, Student, Subject, OfflineQueueItem } from '@/types';

interface SyncResult {
  success: number;
  failed: number;
  conflicts: number;
}

class SyncService {
  private isSyncing = false;
  private listeners = new Set<(status: { isSyncing: boolean; pending: number }) => void>();

  subscribe(listener: (status: { isSyncing: boolean; pending: number }) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.getPendingCount().then(pending => {
      this.listeners.forEach(l => l({ isSyncing: this.isSyncing, pending }));
    });
  }

  async getPendingCount(): Promise<number> {
    const queue = await syncQueue.getAll();
    return queue.length;
  }

  async syncAll(): Promise<SyncResult> {
    if (this.isSyncing) return { success: 0, failed: 0, conflicts: 0 };

    this.isSyncing = true;
    this.notify();

    const result: SyncResult = { success: 0, failed: 0, conflicts: 0 };

    try {
      const queue = await syncQueue.getPending(100);

      for (const item of queue) {
        try {
          await this.processQueueItem(item);
          await syncQueue.remove(item.id);
          result.success++;
        } catch (error) {
          console.error(`Error syncing item ${item.id}:`, error);
          await syncQueue.incrementRetries(item.id);

          const updatedItem = await syncQueue.getAll().then(q => q.find(i => i.id === item.id));
          if (updatedItem && updatedItem.retries >= 3) {
            result.failed++;
            await syncQueue.remove(item.id);
          } else {
            result.failed++;
          }
        }
      }

      // Después de procesar la cola, hacer sync bidireccional
      await this.pullFromServer();

      await offlineMeta.setLastSync('full', Date.now());
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return result;
  }

  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    const { type, entity, data } = item;

    switch (entity) {
      case 'class':
        await this.syncClass(type, data as ClassSession);
        break;
      case 'student':
        await this.syncStudent(type, data as Student);
        break;
      case 'subject':
        await this.syncSubject(type, data as Subject);
        break;
    }
  }

  private async syncClass(type: 'create' | 'update' | 'delete', data: ClassSession): Promise<void> {
    const { student, subject, ...classData } = data;
    const payload = {
      ...classData,
      student_id: data.student_id,
      subject_id: data.subject_id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };

    switch (type) {
      case 'create':
        const { data: created, error: createError } = await supabase
          .from('classes')
          .insert(payload)
          .select()
          .single();
        if (createError) throw createError;
        // Actualizar ID local con ID del servidor
        await offlineClasses.markSynced(data.id);
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from('classes')
          .update(payload)
          .eq('id', data.id);
        if (updateError) throw updateError;
        await offlineClasses.markSynced(data.id);
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('classes')
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        await offlineClasses.delete(data.id);
        break;
    }
  }

  private async syncStudent(type: 'create' | 'update' | 'delete', data: Student): Promise<void> {
    const { ...studentData } = data;
    const payload = {
      ...studentData,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };

    switch (type) {
      case 'create':
        const { data: created, error: createError } = await supabase
          .from('students')
          .insert(payload)
          .select()
          .single();
        if (createError) throw createError;
        // Actualizar con ID del servidor
        await offlineStudents.delete(data.id);
        await offlineStudents.put({ ...created, _synced: true });
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from('students')
          .update(payload)
          .eq('id', data.id);
        if (updateError) throw updateError;
        await offlineStudents.put({ ...data, _synced: true });
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('students')
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        await offlineStudents.delete(data.id);
        break;
    }
  }

  private async syncSubject(type: 'create' | 'update' | 'delete', data: Subject): Promise<void> {
    const payload = {
      ...data,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    };

    switch (type) {
      case 'create':
        const { data: created, error: createError } = await supabase
          .from('subjects')
          .insert(payload)
          .select()
          .single();
        if (createError) throw createError;
        await offlineSubjects.delete(data.id);
        await offlineSubjects.put({ ...created, _synced: true });
        break;

      case 'update':
        const { error: updateError } = await supabase
          .from('subjects')
          .update(payload)
          .eq('id', data.id);
        if (updateError) throw updateError;
        await offlineSubjects.put({ ...data, _synced: true });
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from('subjects')
          .delete()
          .eq('id', data.id);
        if (deleteError) throw deleteError;
        await offlineSubjects.delete(data.id);
        break;
    }
  }

  // Pull: traer datos del servidor y fusionar con local
  async pullFromServer(): Promise<void> {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    const lastSync = await offlineMeta.getLastSync('full') || 0;

    // Traer clases modificadas desde último sync
    const { data: classes } = await supabase
      .from('classes')
      .select('*, student:students(*), subject:subjects(*)')
      .eq('user_id', user.id)
      .gte('updated_at', new Date(lastSync).toISOString())
      .order('updated_at');

    if (classes) {
      for (const c of classes) {
        const local = await offlineClasses.getById(c.id);
        if (!local || new Date(c.updated_at) > new Date(local.updated_at)) {
          await offlineClasses.put({ ...c, _synced: true });
        }
      }
    }

    // Traer estudiantes
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', new Date(lastSync).toISOString());

    if (students) {
      for (const s of students) {
        const local = await offlineStudents.getById(s.id);
        if (!local || new Date(s.updated_at) > new Date(local.updated_at)) {
          await offlineStudents.put({ ...s, _synced: true });
        }
      }
    }

    // Traer asignaturas
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .gte('updated_at', new Date(lastSync).toISOString());

    if (subjects) {
      for (const s of subjects) {
        const local = await offlineSubjects.getAll().then(arr => arr.find(x => x.id === s.id));
        if (!local || new Date(s.updated_at) > new Date(local.updated_at)) {
          await offlineSubjects.put({ ...s, _synced: true });
        }
      }
    }
  }

  // Agregar a cola para sync posterior
  async queueCreate(entity: 'class' | 'student' | 'subject', data: ClassSession | Student | Subject): Promise<void> {
    await syncQueue.add({ type: 'create', entity, data: data as Record<string, unknown> });
    this.notify();
  }

  async queueUpdate(entity: 'class' | 'student' | 'subject', data: ClassSession | Student | Subject): Promise<void> {
    await syncQueue.add({ type: 'update', entity, data: data as Record<string, unknown> });
    this.notify();
  }

  async queueDelete(entity: 'class' | 'student' | 'subject', id: string): Promise<void> {
    await syncQueue.add({ type: 'delete', entity, data: { id } });
    this.notify();
  }

  // Verificar conectividad
  async checkOnline(): Promise<boolean> {
    try {
      const { error } = await supabase.from('subjects').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

export const syncService = new SyncService();

// Auto-sync cada 30 segundos si hay conexión
let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSync(intervalMs = 30000): void {
  if (syncInterval) return;

  syncInterval = setInterval(async () => {
    const online = await syncService.checkOnline();
    if (online) {
      const pending = await syncService.getPendingCount();
      if (pending > 0) {
        await syncService.syncAll();
      }
    }
  }, intervalMs);
}

export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}