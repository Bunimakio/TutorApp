// Store de la sección Pagos: últimos pagos y resumen del mes para el informe.
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { db } from '@/lib/supabase';
import { classAmount, classHours, currentMonthValue, monthRange } from '@/lib/payments';
import type { ClassSession } from '@/types';

export interface PaymentFilters {
  studentId: string;
  subjectId: string;
  date: string;
}

export interface MonthSummary {
  /** Cobrado (solo clases pagadas). */
  paid: number;
  /** Por cobrar (clases pendientes). */
  pending: number;
  /** Cobrado + pendiente. */
  total: number;
  hours: number;
  classes: number;
}

export const usePaymentsStore = defineStore('payments', () => {
  // Últimos pagos (por defecto, los últimos 10).
  const recent = ref<ClassSession[]>([]);
  // Todas las clases del mes elegido (para el informe).
  const monthClasses = ref<ClassSession[]>([]);

  const loading = ref(false);
  const monthLoading = ref(false);
  const error = ref<string | null>(null);

  const filters = ref<PaymentFilters>({ studentId: '', subjectId: '', date: '' });
  const month = ref(currentMonthValue());

  const hasFilters = computed(() =>
    Boolean(filters.value.studentId || filters.value.subjectId || filters.value.date)
  );

  const monthSummary = computed(() => {
    let paid = 0;
    let pending = 0;
    let hours = 0;

    for (const cls of monthClasses.value) {
      hours += classHours(cls);
      const amount = classAmount(cls);
      // Las canceladas no llegan acá: se filtran en la consulta.
      if (cls.status === 'paid') paid += amount;
      else pending += amount;
    }

    return { paid, pending, total: paid + pending, hours, classes: monthClasses.value.length };
  });

  async function fetchRecent(limit = 10): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await db.classes.getRecent({
        limit,
        studentId: filters.value.studentId || undefined,
        subjectId: filters.value.subjectId || undefined,
        date: filters.value.date || undefined,
      });
      if (err) throw err;
      recent.value = (data || []) as unknown as ClassSession[];
    } catch (e) {
      recent.value = [];
      error.value = e instanceof Error ? e.message : 'Error al cargar los últimos pagos';
    } finally {
      loading.value = false;
    }
  }

  async function fetchMonth(): Promise<void> {
    monthLoading.value = true;
    error.value = null;
    try {
      const range = monthRange(month.value);
      const { data, error: err } = await db.classes.getByMonth(range.start, range.end);
      if (err) throw err;
      monthClasses.value = (data || []) as unknown as ClassSession[];
    } catch (e) {
      monthClasses.value = [];
      error.value = e instanceof Error ? e.message : 'Error al cargar el informe del mes';
    } finally {
      monthLoading.value = false;
    }
  }

  function clearFilters(): void {
    filters.value = { studentId: '', subjectId: '', date: '' };
  }

  return {
    recent,
    monthClasses,
    loading,
    monthLoading,
    error,
    filters,
    month,
    hasFilters,
    monthSummary,
    fetchRecent,
    fetchMonth,
    clearFilters,
  };
});
