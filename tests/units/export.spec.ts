// Pruebas de la exportación de datos (respaldo en JSON).
import { describe, expect, it } from 'vitest';
import { buildExportPayload, exportFileName } from '@/lib/export';

describe('exportación de datos', () => {
  it('cuenta alumnos, asignaturas y clases y arma el contenido', () => {
    const payload = buildExportPayload(
      {
        students: [{ id: 's1' }, { id: 's2' }],
        subjects: [{ id: 'm1' }],
        classes: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }],
      },
      new Date('2026-10-15T12:00:00Z')
    );

    expect(payload.app).toBe('TutorApp');
    expect(payload.counts).toEqual({ students: 2, subjects: 1, classes: 3 });
    expect(payload.data.students).toHaveLength(2);
    expect(payload.data.subjects).toHaveLength(1);
    expect(payload.data.classes).toHaveLength(3);
    expect(payload.exportedAt).toBe('2026-10-15T12:00:00.000Z');
  });

  it('tolera listas vacías', () => {
    const payload = buildExportPayload({ students: [], subjects: [], classes: [] });
    expect(payload.counts).toEqual({ students: 0, subjects: 0, classes: 0 });
  });

  it('arma el nombre del archivo con la fecha', () => {
    expect(exportFileName(new Date(2026, 0, 3))).toBe('tutorapp-respaldo-2026-01-03.json');
    expect(exportFileName(new Date(2026, 9, 15))).toBe('tutorapp-respaldo-2026-10-15.json');
  });
});
