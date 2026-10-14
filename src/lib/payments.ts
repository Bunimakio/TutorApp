// Cálculos y formatos de pagos.
// Se usan en la sección "Pagos" (últimos pagos) y en el informe del mes.
import { format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

/** Lo mínimo que necesita una clase para calcular su duración y su monto. */
export interface ClassLike {
  start_time: string;
  end_time: string;
  subject?: { price?: number | null } | null;
}

/** "HH:MM" (o "HH:MM:SS", como devuelve la base) → minutos desde la medianoche. */
export function timeToMinutes(time: string): number {
  const [h, m] = (time || '').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

/** Duración de la clase en horas (0.5, 1, 1.5, ...). */
export function classHours(cls: ClassLike): number {
  return Math.max(0, (timeToMinutes(cls.end_time) - timeToMinutes(cls.start_time)) / 60);
}

/** Monto de la clase: precio por hora de la asignatura × duración. */
export function classAmount(cls: ClassLike): number {
  return (cls.subject?.price || 0) * classHours(cls);
}

/** "25,00 €" */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
}

/** "12/10/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = parseISO(iso);
  return isValid(date) ? format(date, 'dd/MM/yyyy') : iso;
}

/** "09:00" (recorta los segundos que agrega la base). */
export function formatTime(time: string | null | undefined): string {
  return (time || '').slice(0, 5);
}

/** Horas sin decimales de más: 2 → "2", 1.5 → "1,5". */
export function formatHours(hours: number): string {
  const rounded = Math.round(hours * 10) / 10;
  return rounded.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

/**
 * Primer y último día de un mes en formato "yyyy-MM-dd".
 * El "día 0" del mes siguiente es el último del mes actual, así que febrero de
 * un año bisiesto devuelve el 29 y el de un año normal el 28.
 */
export function monthRange(monthValue: string): { start: string; end: string; year: number; month: number } {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue || '');
  const now = new Date();
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) : now.getMonth() + 1;

  const first = new Date(year, month - 1, 1);
  const last = new Date(year, month, 0);

  return { start: format(first, 'yyyy-MM-dd'), end: format(last, 'yyyy-MM-dd'), year, month };
}

/** "octubre de 2026" */
export function monthLabel(monthValue: string): string {
  const { year, month } = monthRange(monthValue);
  return format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: es });
}

/** "13 de octubre de 2026" (fecha del informe). */
export function formatLongDate(date: Date = new Date()): string {
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** "2026-10" del mes actual (valor para el selector de mes). */
export function currentMonthValue(): string {
  return format(new Date(), 'yyyy-MM');
}
