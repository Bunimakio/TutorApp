// Chequeos de los datos de prueba ([DEMO]) que se cargan desde Ajustes.
import { describe, it, expect, vi } from 'vitest';
import { differenceInCalendarDays, getDay, parseISO } from 'date-fns';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
  getCurrentUserId: vi.fn(async () => 'user-1'),
  db: { subjects: { getAll: vi.fn() } },
}));

import { DEMO_PREFIX, addMinutesToTime, buildDemoClassRows, buildDemoStudentRows } from '@/lib/demo';

// Lunes 12/10/2026 (fecha fija: los tests no dependen del día de hoy).
const MONDAY = new Date(2026, 9, 12);
const SUBJECTS = ['s0', 's1', 's2', 's3'];

describe('datos de prueba', () => {
  it('marca a todos los alumnos con el prefijo [DEMO]', () => {
    const students = buildDemoStudentRows();

    expect(students.length).toBeGreaterThanOrEqual(5);
    expect(students.every(s => s.full_name.startsWith(DEMO_PREFIX))).toBe(true);
  });

  it('arma cada clase con el día de la semana que corresponde a su fecha', () => {
    const rows = buildDemoClassRows(MONDAY, SUBJECTS);

    expect(rows.length).toBeGreaterThan(15);
    for (const row of rows) {
      // day_of_week: 1 = lunes ... 6 = sábado (getDay() usa el mismo valor)
      expect(getDay(parseISO(row.date))).toBe(row.day_of_week);
    }
  });

  it('no pone dos clases a la misma hora del mismo día (el calendario lo rechazaría)', () => {
    const rows = buildDemoClassRows(MONDAY, SUBJECTS);
    const byDate = new Map<string, typeof rows>();

    for (const row of rows) {
      const list = byDate.get(row.date) || [];
      list.push(row);
      byDate.set(row.date, list);
    }

    const overlaps: string[] = [];
    for (const [date, list] of byDate) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i];
          const b = list[j];
          if (a.start_time < b.end_time && b.start_time < a.end_time) {
            overlaps.push(`${date}: ${a.start_time}-${a.end_time} y ${b.start_time}-${b.end_time}`);
          }
        }
      }
    }

    expect(overlaps).toEqual([]);
  });

  it('incluye pagos de hace más de 30 días (para probar el total abonado histórico)', () => {
    const rows = buildDemoClassRows(MONDAY, SUBJECTS);
    const viejasPagadas = rows.filter(
      r => r.status === 'paid' && differenceInCalendarDays(MONDAY, parseISO(r.date)) > 30
    );

    expect(viejasPagadas.length).toBeGreaterThan(0);
  });

  it('incluye clases pagadas, pendientes y canceladas', () => {
    const statuses = new Set(buildDemoClassRows(MONDAY, SUBJECTS).map(r => r.status));

    expect(statuses).toEqual(new Set(['paid', 'pending', 'cancelled']));
  });

  it('calcula la hora de fin según la duración', () => {
    const rows = buildDemoClassRows(MONDAY, SUBJECTS);

    // Franco: clase larga (120 min) a las 15:00
    const larga = rows.find(r => r.date === '2026-10-12' && r.start_time === '15:00');
    expect(larga?.end_time).toBe('17:00');

    // Gabriela: media hora a las 19:00
    const media = rows.find(r => r.start_time === '19:00');
    expect(media?.end_time).toBe('19:30');
  });

  it('carga el calendario de la semana actual', () => {
    const rows = buildDemoClassRows(MONDAY, SUBJECTS);
    const semanaActual = rows.filter(r => r.date >= '2026-10-12' && r.date <= '2026-10-17');

    expect(semanaActual.length).toBeGreaterThanOrEqual(10);
  });

  it('reutiliza las asignaturas existentes cuando hay menos', () => {
    const rows = buildDemoClassRows(MONDAY, ['solo-una']);

    expect(rows.every(r => r.subject_id === 'solo-una')).toBe(true);
  });

  it('suma minutos correctamente (incluso pasando de hora)', () => {
    expect(addMinutesToTime('09:00', 90)).toBe('10:30');
    expect(addMinutesToTime('15:00', 120)).toBe('17:00');
    expect(addMinutesToTime('23:30', 60)).toBe('00:30');
  });
});
