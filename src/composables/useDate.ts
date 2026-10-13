// Composable para manejo de fechas
import { format, parseISO, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay, isSameWeek, isWithinInterval, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export function useDate() {
  const weekStartsOn = 1; // Lunes

  function getWeekRange(date: Date = new Date()) {
    const start = startOfWeek(date, { weekStartsOn });
    const end = endOfWeek(date, { weekStartsOn });
    return { start, end };
  }

  function getWeekDays(date: Date = new Date()) {
    const { start } = getWeekRange(date);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(addDays(start, i));
    }
    return days;
  }

  function formatDate(date: Date, pattern = 'dd/MM/yyyy') {
    return format(date, pattern, { locale: es });
  }

  function formatTime(date: Date) {
    return format(date, 'HH:mm', { locale: es });
  }

  function formatDateTime(date: Date) {
    return format(date, 'dd/MM/yyyy HH:mm', { locale: es });
  }

  function parseDate(str: string) {
    return parseISO(str);
  }

  function getDayName(date: Date, short = false) {
    return format(date, short ? 'EEE' : 'EEEE', { locale: es });
  }

  function getMonthName(date: Date, short = false) {
    return format(date, short ? 'MMM' : 'MMMM', { locale: es });
  }

  function navigateWeek(current: Date, direction: 'prev' | 'next') {
    return direction === 'prev' ? subWeeks(current, 1) : addWeeks(current, 1);
  }

  function isToday(date: Date) {
    return isSameDay(date, new Date());
  }

  function isCurrentWeek(date: Date) {
    return isSameWeek(date, new Date(), { weekStartsOn });
  }

  function isDateInWeek(date: Date, weekStart: Date) {
    const { start, end } = getWeekRange(weekStart);
    return isWithinInterval(date, { start, end });
  }

  function getTimeSlots(startHour = 8, endHour = 22, intervalMinutes = 30) {
    const slots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += intervalMinutes) {
        slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }

  function addMinutesToTime(timeStr: string, minutes: number) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  function getMinutesDiff(start: string, end: string) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
  }

  function timeToMinutes(timeStr: string) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function minutesToTime(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  return {
    weekStartsOn,
    getWeekRange,
    getWeekDays,
    formatDate,
    formatTime,
    formatDateTime,
    parseDate,
    getDayName,
    getMonthName,
    navigateWeek,
    isToday,
    isCurrentWeek,
    isDateInWeek,
    getTimeSlots,
    addMinutesToTime,
    getMinutesDiff,
    timeToMinutes,
    minutesToTime,
  };
}