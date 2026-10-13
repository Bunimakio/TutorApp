// Store de clases (calendar)
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { db, getCurrentUserId } from '@/lib/supabase';
import { offlineClasses } from '@/lib/indexeddb';
import { syncService } from '@/lib/sync';
import { useSubjectsStore } from './subjects';
import { useStudentsStore } from './students';
import type { ClassSession, ClassFormData, CalendarCell, WeekRange, DayOfWeek } from '@/types';
import { toPlain } from '@/lib/plain';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

// Supabase devuelve las columnas de tipo `time` como "HH:MM:SS", pero el resto
// de la app trabaja en "HH:MM" (el input type="time" tampoco acepta segundos).
// Normalizamos al cargar/guardar para que las comparaciones de horario cuadren.
function normalizeClass<T extends Record<string, any>>(c: T): T {
  return {
    ...c,
    start_time: typeof c.start_time === 'string' ? c.start_time.slice(0, 5) : c.start_time,
    end_time: typeof c.end_time === 'string' ? c.end_time.slice(0, 5) : c.end_time,
  };
}

export const useClassesStore = defineStore('classes', () => {
  const classes = ref<ClassSession[]>([]);
  const currentWeek = ref<WeekRange>({ start: new Date(), end: new Date() });
  const loading = ref(false);
  const error = ref<string | null>(null);
  const selectedClass = ref<ClassSession | null>(null);
  const showForm = ref(false);
  const formMode = ref<'create' | 'edit'>('create');

  const subjectsStore = useSubjectsStore();
  const studentsStore = useStudentsStore();

  // Inicializar semana actual
  function initCurrentWeek(): void {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Lunes
    const end = endOfWeek(now, { weekStartsOn: 1 }); // Domingo
    currentWeek.value = { start, end };
  }

  const weekDays = computed(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeek.value.start, i));
    }
    return days;
  });

  const timeSlots = computed(() => {
    const slots: string[] = [];
    const startHour = 8;
    const endHour = 22;
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  });

  const calendarGrid = computed((): CalendarCell[][] => {
    const grid: CalendarCell[][] = [];
    const now = new Date();
    const today = startOfDay(now);

    for (const time of timeSlots.value) {
      const row: CalendarCell[] = [];
      const [hourStr, minuteStr] = time.split(':');
      const slotTime = new Date();
      slotTime.setHours(parseInt(hourStr), parseInt(minuteStr), 0, 0);

      for (let dayIndex = 0; dayIndex < 6; dayIndex++) { // Lunes a Sábado
        const day = (dayIndex + 1) as DayOfWeek;
        const date = weekDays.value[dayIndex];
        const dateStr = format(date, 'yyyy-MM-dd');

        // La FECHA es la fuente de verdad para ubicar la clase en su columna
        // (el día de la semana se deriva de ella). Antes se exigía que
        // coincidieran día Y fecha, así que una clase con esos datos
        // desincronizados no se mostraba nunca.
        const classInSlot = classes.value.find(c =>
          c.date === dateStr &&
          c.start_time <= time &&
          c.end_time > time &&
          c.status !== 'cancelled'
        );

        const cellDate = startOfDay(date);
        row.push({
          day,
          time,
          date: dateStr,
          class: classInSlot,
          isCurrentTime: isSameDay(cellDate, today) &&
            slotTime.getHours() === now.getHours() &&
            Math.abs(slotTime.getMinutes() - now.getMinutes()) < 30,
          isPast: cellDate < today || (isSameDay(cellDate, today) && slotTime < now),
        });
      }
      grid.push(row);
    }
    return grid;
  });

  const classesByDate = computed(() => {
    const map: Record<string, ClassSession[]> = {};
    for (const c of classes.value) {
      if (!map[c.date]) map[c.date] = [];
      map[c.date].push(c);
    }
    return map;
  });

  const pendingClasses = computed(() =>
    classes.value.filter(c => c.status === 'pending')
  );

  const paidClasses = computed(() =>
    classes.value.filter(c => c.status === 'paid')
  );

  async function fetchWeek(weekStart: Date, weekEnd: Date): Promise<void> {
    loading.value = true;
    error.value = null;

    // Solo reasignar si el rango cambió de verdad. Reasignar siempre crea un
    // objeto nuevo y puede disparar bucles de watchers/computed.
    if (
      currentWeek.value.start.getTime() !== weekStart.getTime() ||
      currentWeek.value.end.getTime() !== weekEnd.getTime()
    ) {
      currentWeek.value = { start: weekStart, end: weekEnd };
    }

    const startStr = format(weekStart, 'yyyy-MM-dd');
    const endStr = format(weekEnd, 'yyyy-MM-dd');

    try {
      const { data, error: err } = await db.classes.getByWeek(startStr, endStr);
      if (err) throw err;

      if (data) {
        classes.value = data.map(c => normalizeClass({ ...c, _synced: true }));
        // Guardar en offline sin que un fallo de caché descarte los datos del servidor.
        try {
          for (const c of classes.value) {
            await offlineClasses.put(toPlain(c));
          }
        } catch (cacheErr) {
          console.warn('No se pudo cachear clases en IndexedDB:', cacheErr);
        }
      } else {
        const offline = await offlineClasses.getByDateRange(startStr, endStr);
        classes.value = offline.map(normalizeClass);
      }
    } catch (e) {
      console.warn('Error fetching classes, using offline:', e);
      const offline = await offlineClasses.getByDateRange(startStr, endStr);
      classes.value = offline;
      error.value = e instanceof Error ? e.message : 'Error al cargar clases';
    } finally {
      loading.value = false;
    }
  }

  async function fetchDate(date: Date): Promise<void> {
    const dateStr = format(date, 'yyyy-MM-dd');
    try {
      const { data, error: err } = await db.classes.getByDate(dateStr);
      if (err) throw err;

      if (data) {
        // Merge with existing classes for the week
        const existingIds = new Set(classes.value.map(c => c.id));
        for (const c of data) {
          if (!existingIds.has(c.id)) {
            classes.value.push(normalizeClass({ ...c, _synced: true }));
            await offlineClasses.put({ ...c, _synced: true });
          }
        }
      }
    } catch (e) {
      console.warn('Error fetching date classes:', e);
    }
  }

  async function checkConflict(
    dayOfWeek: DayOfWeek,
    startTime: string,
    endTime: string,
    date: string,
    excludeId?: string
  ): Promise<boolean> {
    try {
      const { data, error: err } = await db.classes.checkConflict(dayOfWeek, startTime, endTime, date, excludeId);
      if (err) throw err;
      return (data?.length || 0) > 0;
    } catch (e) {
      // Verificar localmente
      return classes.value.some(c =>
        c.id !== excludeId &&
        c.day_of_week === dayOfWeek &&
        c.date === date &&
        c.status !== 'cancelled' &&
        c.start_time < endTime &&
        c.end_time > startTime
      );
    }
  }

  async function create(formData: ClassFormData): Promise<ClassSession | null> {
    loading.value = true;
    error.value = null;

    const endTime = addMinutes(formData.start_time, formData.duration_minutes);

    // Validar solapamiento
    const hasConflict = await checkConflict(
      formData.day_of_week,
      formData.start_time,
      endTime,
      formData.date
    );

    if (hasConflict) {
      error.value = 'Ya existe una clase en ese horario';
      loading.value = false;
      return null;
    }

    // Buscar o crear alumno
    let student = studentsStore.students.find(
      s => s.full_name.toLowerCase() === formData.student_name.toLowerCase()
    );

    if (!student && formData.student_email) {
      student = studentsStore.students.find(
        s => s.email?.toLowerCase() === formData.student_email.toLowerCase()
      );
    }

    if (!student) {
      student = await studentsStore.create({
        full_name: formData.student_name,
        email: formData.student_email || null,
        phone: null,
        notes: null,
      });
      if (!student) {
        error.value = 'Error al crear alumno';
        loading.value = false;
        return null;
      }
    }

    const classData = {
      student_id: student.id,
      subject_id: formData.subject_id,
      day_of_week: formData.day_of_week,
      start_time: formData.start_time,
      end_time: endTime,
      date: formData.date,
      status: 'pending' as const,
      notes: formData.notes || null,
    };

    try {
      const user = await getCurrentUserId();
      if (!user) throw new Error('Usuario no autenticado');

      const { data, error: err } = await db.classes.create({
        ...classData,
        user_id: user,
      } as any);

      if (err) throw err;

      const newClass = normalizeClass({ ...data, student, subject: subjectsStore.subjects.find(s => s.id === formData.subject_id), _synced: true } as ClassSession);
      classes.value.push(newClass);
      await offlineClasses.put(newClass);

      // Actualizar stats del alumno
      await studentsStore.fetchWithStats(student.id);

      showForm.value = false;
      return newClass;
    } catch (e) {
      // Offline
      const tempId = `temp_${Date.now()}`;
      const newClass: ClassSession = {
        ...classData,
        id: tempId,
        student,
        subject: subjectsStore.subjects.find(s => s.id === formData.subject_id),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _synced: false,
      };
      classes.value.push(newClass);
      await offlineClasses.put(newClass);
      await syncService.queueCreate('class', newClass);

      await studentsStore.fetchWithStats(student.id);

      showForm.value = false;
      error.value = e instanceof Error ? e.message : 'Error al crear clase (guardado offline)';
      return newClass;
    } finally {
      loading.value = false;
    }
  }

  async function update(id: string, updates: Partial<ClassSession>): Promise<ClassSession | null> {
    loading.value = true;
    error.value = null;

    const existingClass = classes.value.find(c => c.id === id);
    if (!existingClass) {
      error.value = 'Clase no encontrada';
      loading.value = false;
      return null;
    }

    // Si cambia horario/día, validar conflicto
    if (updates.day_of_week || updates.start_time || updates.end_time || updates.date) {
      const day = updates.day_of_week || existingClass.day_of_week;
      const start = updates.start_time || existingClass.start_time;
      const end = updates.end_time || existingClass.end_time;
      const date = updates.date || existingClass.date;

      const hasConflict = await checkConflict(day, start, end, date, id);
      if (hasConflict) {
        error.value = 'Ya existe una clase en ese horario';
        loading.value = false;
        return null;
      }
    }

    try {
      const { data, error: err } = await db.classes.update(id, updates);
      if (err) throw err;

      const updated = normalizeClass({ ...data, _synced: true } as ClassSession);
      const idx = classes.value.findIndex(c => c.id === id);
      if (idx !== -1) {
        classes.value[idx] = { ...classes.value[idx], ...updated };
      }
      if (selectedClass.value?.id === id) {
        selectedClass.value = { ...selectedClass.value, ...updated };
      }
      await offlineClasses.put(updated);

      // Actualizar stats si cambió alumno o status
      if (updates.student_id || updates.status) {
        await studentsStore.fetchWithStats(updated.student_id);
        if (existingClass.student_id !== updated.student_id) {
          await studentsStore.fetchWithStats(existingClass.student_id);
        }
      }

      return updated;
    } catch (e) {
      // Offline
      const idx = classes.value.findIndex(c => c.id === id);
      if (idx !== -1) {
        const updated = { ...classes.value[idx], ...updates, updated_at: new Date().toISOString(), _synced: false };
        classes.value[idx] = updated;
        if (selectedClass.value?.id === id) {
          selectedClass.value = updated;
        }
        await offlineClasses.put(updated);
        await syncService.queueUpdate('class', updated);
      }
      error.value = e instanceof Error ? e.message : 'Error al actualizar clase';
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function updateStatus(id: string, status: 'pending' | 'paid' | 'cancelled'): Promise<boolean> {
    const existingClass = classes.value.find(c => c.id === id);
    if (!existingClass) return false;

    try {
      const { error: err } = await db.classes.updateStatus(id, status);
      if (err) throw err;

      const idx = classes.value.findIndex(c => c.id === id);
      if (idx !== -1) {
        classes.value[idx].status = status;
      }
      if (selectedClass.value?.id === id) {
        selectedClass.value.status = status;
      }
      await offlineClasses.put({ ...classes.value[idx], status, _synced: true });

      await studentsStore.fetchWithStats(existingClass.student_id);
      return true;
    } catch (e) {
      const idx = classes.value.findIndex(c => c.id === id);
      if (idx !== -1) {
        classes.value[idx].status = status;
        classes.value[idx]._synced = false;
        await offlineClasses.put(toPlain(classes.value[idx]));
        await syncService.queueUpdate('class', classes.value[idx]);
      }
      error.value = e instanceof Error ? e.message : 'Error al actualizar estado';
      return false;
    }
  }

  async function remove(id: string): Promise<boolean> {
    loading.value = true;
    error.value = null;

    const existingClass = classes.value.find(c => c.id === id);
    const studentId = existingClass?.student_id;

    try {
      const { error: err } = await db.classes.delete(id);
      if (err) throw err;

      classes.value = classes.value.filter(c => c.id !== id);
      if (selectedClass.value?.id === id) {
        selectedClass.value = null;
      }
      await offlineClasses.delete(id);

      if (studentId) {
        await studentsStore.fetchWithStats(studentId);
      }

      return true;
    } catch (e) {
      classes.value = classes.value.filter(c => c.id !== id);
      if (selectedClass.value?.id === id) {
        selectedClass.value = null;
      }
      await offlineClasses.delete(id);
      await syncService.queueDelete('class', id);

      if (studentId) {
        await studentsStore.fetchWithStats(studentId);
      }

      error.value = e instanceof Error ? e.message : 'Error al eliminar clase';
      return false;
    } finally {
      loading.value = false;
    }
  }

  function openForm(mode: 'create' | 'edit', classData?: ClassSession, cell?: CalendarCell): void {
    formMode.value = mode;
    if (mode === 'edit' && classData) {
      selectedClass.value = classData;
    } else if (cell) {
      // Pre-llenar formulario con día y hora de la celda
      selectedClass.value = {
        id: '',
        student_id: '',
        subject_id: subjectsStore.defaultSubject?.id || '',
        day_of_week: cell.day,
        start_time: cell.time,
        end_time: addMinutes(cell.time, 60),
        date: format(weekDays.value[cell.day - 1], 'yyyy-MM-dd'),
        status: 'pending',
        notes: null,
        created_at: '',
        updated_at: '',
      } as ClassSession;
    }
    showForm.value = true;
  }

  function closeForm(): void {
    showForm.value = false;
    selectedClass.value = null;
    formMode.value = 'create';
  }

  function navigateWeek(direction: 'prev' | 'next'): void {
    const days = direction === 'prev' ? -7 : 7;
    const newStart = addDays(currentWeek.value.start, days);
    const newEnd = addDays(currentWeek.value.end, days);
    fetchWeek(newStart, newEnd);
  }

  function goToToday(): void {
    initCurrentWeek();
    fetchWeek(currentWeek.value.start, currentWeek.value.end);
  }

  function addMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  // Inicializar
  initCurrentWeek();

  return {
    classes,
    currentWeek,
    weekDays,
    timeSlots,
    calendarGrid,
    classesByDate,
    pendingClasses,
    paidClasses,
    loading,
    error,
    selectedClass,
    showForm,
    formMode,
    fetchWeek,
    fetchDate,
    checkConflict,
    create,
    update,
    updateStatus,
    remove,
    openForm,
    closeForm,
    navigateWeek,
    goToToday,
    initCurrentWeek,
  };
});