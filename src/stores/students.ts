// Store de alumnos (students)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, getCurrentUserId } from '@/lib/supabase';
import { offlineStudents } from '@/lib/indexeddb';
import { syncService } from '@/lib/sync';
import type { Student, StudentStats, StudentFilters } from '@/types';
import { toPlain } from '@/lib/plain';

export const useStudentsStore = defineStore('students', () => {
  const students = ref<Student[]>([]);
  const selectedStudent = ref<Student | null>(null);
  const studentStats = ref<StudentStats | null>(null);
  const recentClasses = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<StudentFilters>({
    search: '',
    sortBy: 'last_class',
    sortOrder: 'desc',
  });

  const filteredStudents = computed(() => {
    let result = [...students.value];

    // Búsqueda
    if (filters.value.search) {
      const query = filters.value.search.toLowerCase();
      result = result.filter(s =>
        s.full_name.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query)
      );
    }

    // Ordenamiento
    result.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (filters.value.sortBy) {
        case 'name':
          aVal = a.full_name.toLowerCase();
          bVal = b.full_name.toLowerCase();
          break;
        case 'total_classes':
          aVal = a.total_classes || 0;
          bVal = b.total_classes || 0;
          break;
        case 'total_hours':
          aVal = a.total_hours || 0;
          bVal = b.total_hours || 0;
          break;
        case 'last_class':
        default:
          aVal = a.last_class_date ? new Date(a.last_class_date).getTime() : 0;
          bVal = b.last_class_date ? new Date(b.last_class_date).getTime() : 0;
          break;
      }

      if (filters.value.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return result;
  });

  async function fetchAll(forceRefresh = false): Promise<void> {
    if (students.value.length > 0 && !forceRefresh) return;

    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await db.students.getAll();
      if (err) throw err;

      if (data) {
        students.value = data.map(s => ({ ...s, _synced: true }));
        // Cachear en IndexedDB sin que un fallo de caché descarte los datos del
        // servidor (los elementos de students.value son Proxies de Vue y no se
        // pueden clonar directamente).
        try {
          for (const s of students.value) {
            await offlineStudents.put(toPlain(s));
          }
        } catch (cacheErr) {
          console.warn('No se pudo cachear alumnos en IndexedDB:', cacheErr);
        }
      } else {
        const offline = await offlineStudents.getAll();
        students.value = offline;
      }
    } catch (e) {
      console.warn('Error fetching students, using offline:', e);
      const offline = await offlineStudents.getAll();
      students.value = offline;
      error.value = e instanceof Error ? e.message : 'Error al cargar alumnos';
    } finally {
      loading.value = false;
    }
  }

  async function fetchWithStats(studentId: string): Promise<{ student: Student; stats: StudentStats } | null> {
    loading.value = true;
    error.value = null;
    try {
      // Obtener stats del servidor
      const { data: statsData, error: statsErr } = await db.students.getWithStats(studentId);
      if (statsErr) throw statsErr;

      // Obtener clases recientes
      const { data: classesData, error: classesErr } = await db.classes.getByStudent(studentId, 5);
      if (classesErr) throw classesErr;

      const stats = statsData?.[0] || {
        total_classes: 0,
        total_hours: 0,
        classes_last_30_days: 0,
        paid_last_30_days: 0,
        pending_amount: 0,
        last_class_date: null,
      };

      const student = students.value.find(s => s.id === studentId) ||
        (await offlineStudents.getById(studentId)) ||
        { id: studentId, full_name: '', email: null, phone: null, notes: null, created_at: '', updated_at: '' };

      const enrichedStudent: Student = {
        ...student,
        total_classes: stats.total_classes,
        total_hours: stats.total_hours,
        last_class_date: stats.last_class_date,
        classes_last_month: stats.classes_last_30_days,
        paid_last_month: stats.paid_last_30_days,
      };

      selectedStudent.value = enrichedStudent;
      studentStats.value = {
        student_id: studentId,
        ...stats,
        recent_classes: classesData || [],
      };
      recentClasses.value = classesData || [];

      return { student: enrichedStudent, stats: studentStats.value };
    } catch (e) {
      console.warn('Error fetching student stats, using offline:', e);
      // Fallback a datos locales
      const student = students.value.find(s => s.id === studentId) ||
        await offlineStudents.getById(studentId);

      if (student) {
        selectedStudent.value = student;
        studentStats.value = {
          student_id: studentId,
          total_classes: student.total_classes || 0,
          total_hours: student.total_hours || 0,
          classes_last_30_days: student.classes_last_month || 0,
          paid_last_30_days: student.paid_last_month || 0,
          pending_amount: 0,
          last_class_date: student.last_class_date || null,
          recent_classes: [],
        };
        return { student, stats: studentStats.value };
      }
      error.value = e instanceof Error ? e.message : 'Error al cargar alumno';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function search(query: string): Promise<Student[]> {
    if (!query.trim()) return [];

    try {
      const { data, error: err } = await db.students.search(query);
      if (err) throw err;
      return data || [];
    } catch (e) {
      // Búsqueda local
      const q = query.toLowerCase();
      return students.value.filter(s =>
        s.full_name.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    }
  }

  async function create(student: Omit<Student, 'id' | 'created_at' | 'updated_at' | '_synced' | 'total_classes' | 'total_hours' | 'last_class_date' | 'classes_last_month' | 'paid_last_month'>): Promise<Student | null> {
    loading.value = true;
    error.value = null;
    try {
      const user = await getCurrentUserId();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error: err } = await db.students.create({
        ...student,
        user_id: user,
      } as any);

      if (err) throw err;

      const newStudent = { ...data, _synced: true } as Student;
      students.value.unshift(newStudent);
      await offlineStudents.put(newStudent);
      return newStudent;
    } catch (e) {
      const tempId = `temp_${Date.now()}`;
      const newStudent: Student = {
        ...student,
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _synced: false,
        total_classes: 0,
        total_hours: 0,
        last_class_date: null,
        classes_last_month: 0,
        paid_last_month: 0,
      };
      students.value.unshift(newStudent);
      await offlineStudents.put(newStudent);
      await syncService.queueCreate('student', newStudent);
      error.value = e instanceof Error ? e.message : 'Error al crear alumno';
      return newStudent;
    } finally {
      loading.value = false;
    }
  }

  async function update(id: string, updates: Partial<Student>): Promise<Student | null> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await db.students.update(id, updates);
      if (err) throw err;

      const updated = { ...data, _synced: true } as Student;
      const idx = students.value.findIndex(s => s.id === id);
      if (idx !== -1) {
        students.value[idx] = { ...students.value[idx], ...updated };
      }
      if (selectedStudent.value?.id === id) {
        selectedStudent.value = { ...selectedStudent.value, ...updated };
      }
      await offlineStudents.put(updated);
      return updated;
    } catch (e) {
      const idx = students.value.findIndex(s => s.id === id);
      if (idx !== -1) {
        const updated = { ...students.value[idx], ...updates, updated_at: new Date().toISOString(), _synced: false };
        students.value[idx] = updated;
        if (selectedStudent.value?.id === id) {
          selectedStudent.value = updated;
        }
        await offlineStudents.put(updated);
        await syncService.queueUpdate('student', updated);
      }
      error.value = e instanceof Error ? e.message : 'Error al actualizar alumno';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function remove(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;
    try {
      const { error: err } = await db.students.delete(id);
      if (err) throw err;

      students.value = students.value.filter(s => s.id !== id);
      if (selectedStudent.value?.id === id) {
        selectedStudent.value = null;
        studentStats.value = null;
        recentClasses.value = [];
      }
      await offlineStudents.delete(id);
      return true;
    } catch (e) {
      students.value = students.value.filter(s => s.id !== id);
      if (selectedStudent.value?.id === id) {
        selectedStudent.value = null;
      }
      await offlineStudents.delete(id);
      await syncService.queueDelete('student', id);
      error.value = e instanceof Error ? e.message : 'Error al eliminar alumno';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: Partial<StudentFilters>): void {
    filters.value = { ...filters.value, ...newFilters };
  }

  function clearSelection(): void {
    selectedStudent.value = null;
    studentStats.value = null;
    recentClasses.value = [];
  }

  return {
    students,
    filteredStudents,
    selectedStudent,
    studentStats,
    recentClasses,
    loading,
    error,
    filters,
    fetchAll,
    fetchWithStats,
    search,
    create,
    update,
    remove,
    setFilters,
    clearSelection,
  };
});