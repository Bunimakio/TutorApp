// IndexedDB para almacenamiento offline y cola de sincronización

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { OfflineQueueItem, ClassSession, Student, Subject } from '@/types';
import { toPlain } from './plain';

interface TutoringDB extends DBSchema {
  classes: {
    key: string;
    value: ClassSession & { _synced: boolean; _localId?: string };
    indexes: { 'by-date': string; 'by-student': string; 'by-status': string };
  };
  students: {
    key: string;
    value: Student & { _synced: boolean };
    indexes: { 'by-name': string };
  };
  subjects: {
    key: string;
    value: Subject & { _synced: boolean };
  };
  queue: {
    key: string;
    value: OfflineQueueItem;
    indexes: { 'by-timestamp': number };
  };
  settings: {
    key: string;
    value: { key: string; value: unknown };
  };
  metadata: {
    key: string;
    value: { key: string; value: unknown; updatedAt: number };
  };
}

let dbInstance: IDBPDatabase<TutoringDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<TutoringDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<TutoringDB>('tutoring-app', 1, {
    upgrade(db) {
      // Classes store
      const classStore = db.createObjectStore('classes', { keyPath: 'id' });
      classStore.createIndex('by-date', 'date');
      classStore.createIndex('by-student', 'student_id');
      classStore.createIndex('by-status', 'status');

      // Students store
      const studentStore = db.createObjectStore('students', { keyPath: 'id' });
      studentStore.createIndex('by-name', 'full_name');

      // Subjects store
      db.createObjectStore('subjects', { keyPath: 'id' });

      // Sync queue
      const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
      queueStore.createIndex('by-timestamp', 'timestamp');

      // Settings & metadata
      db.createObjectStore('settings', { keyPath: 'key' });
      db.createObjectStore('metadata', { keyPath: 'key' });
    },
  });

  return dbInstance;
}

// NOTA: todos los `put` pasan por `toPlain()` porque IndexedDB no puede clonar
// los Proxies reactivos de Vue (lanzaría DataCloneError), y muchos objetos que
// guardamos contienen referencias reactivas (p. ej. `class.student`).

// Helpers para classes
export const offlineClasses = {
  async getAll(): Promise<(ClassSession & { _synced: boolean })[]> {
    const db = await getDB();
    return db.getAll('classes');
  },

  async getByDateRange(start: string, end: string): Promise<(ClassSession & { _synced: boolean })[]> {
    const db = await getDB();
    const all = await db.getAll('classes');
    return all.filter(c => c.date >= start && c.date <= end);
  },

  async getById(id: string): Promise<(ClassSession & { _synced: boolean }) | undefined> {
    const db = await getDB();
    return db.get('classes', id);
  },

  async put(classData: ClassSession & { _synced: boolean; _localId?: string }): Promise<string> {
    const db = await getDB();
    return db.put('classes', toPlain(classData));
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('classes', id);
  },

  async markSynced(id: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('classes', id);
    if (item) {
      item._synced = true;
      await db.put('classes', toPlain(item));
    }
  },
};

// Helpers para students
export const offlineStudents = {
  async getAll(): Promise<(Student & { _synced: boolean })[]> {
    const db = await getDB();
    return db.getAll('students');
  },

  async getById(id: string): Promise<(Student & { _synced: boolean }) | undefined> {
    const db = await getDB();
    return db.get('students', id);
  },

  async put(student: Student & { _synced: boolean }): Promise<string> {
    const db = await getDB();
    return db.put('students', toPlain(student));
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('students', id);
  },
};

// Helpers para subjects
export const offlineSubjects = {
  async getAll(): Promise<(Subject & { _synced: boolean })[]> {
    const db = await getDB();
    return db.getAll('subjects');
  },

  async put(subject: Subject & { _synced: boolean }): Promise<string> {
    const db = await getDB();
    return db.put('subjects', toPlain(subject));
  },

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('subjects', id);
  },
};

// Cola de sincronización
export const syncQueue = {
  async add(item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const db = await getDB();
    const id = crypto.randomUUID();
    const queueItem: OfflineQueueItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retries: 0,
    };
    await db.put('queue', toPlain(queueItem));
    return id;
  },

  async getAll(): Promise<OfflineQueueItem[]> {
    const db = await getDB();
    return db.getAllFromIndex('queue', 'by-timestamp');
  },

  async getPending(limit = 50): Promise<OfflineQueueItem[]> {
    const db = await getDB();
    const all = await db.getAllFromIndex('queue', 'by-timestamp');
    return all.slice(0, limit);
  },

  async remove(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('queue', id);
  },

  async incrementRetries(id: string): Promise<void> {
    const db = await getDB();
    const item = await db.get('queue', id);
    if (item) {
      item.retries++;
      await db.put('queue', toPlain(item));
    }
  },

  async clear(): Promise<void> {
    const db = await getDB();
    await db.clear('queue');
  },
};

// Metadata para sync timestamps
export const offlineMeta = {
  async getLastSync(entity: string): Promise<number | null> {
    const db = await getDB();
    const meta = await db.get('metadata', `lastSync_${entity}`);
    return meta?.value as number ?? null;
  },

  async setLastSync(entity: string, timestamp: number): Promise<void> {
    const db = await getDB();
    await db.put('metadata', {
      key: `lastSync_${entity}`,
      value: timestamp,
      updatedAt: Date.now(),
    });
  },

  async getSetting(key: string): Promise<unknown> {
    const db = await getDB();
    const setting = await db.get('settings', key);
    return setting?.value;
  },

  async setSetting(key: string, value: unknown): Promise<void> {
    const db = await getDB();
    await db.put('settings', toPlain({ key, value }));
  },
};

// Inicialización
export async function initOfflineDB(): Promise<void> {
  await getDB();
  console.log('✅ IndexedDB inicializado');
}
