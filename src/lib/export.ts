// Exportación de datos de la app a un archivo JSON (respaldo).
// La lógica de armado es pura para poder probarla sin navegador.

export interface ExportData {
  students: unknown[];
  subjects: unknown[];
  classes: unknown[];
}

export interface ExportCounts {
  students: number;
  subjects: number;
  classes: number;
}

export interface ExportPayload {
  app: string;
  version: string;
  exportedAt: string;
  counts: ExportCounts;
  data: ExportData;
}

export const EXPORT_APP_NAME = 'TutorApp';
export const EXPORT_VERSION = '1.0.0';

/** Arma el objeto que se guarda en el archivo de respaldo. */
export function buildExportPayload(data: ExportData, now: Date = new Date()): ExportPayload {
  return {
    app: EXPORT_APP_NAME,
    version: EXPORT_VERSION,
    exportedAt: now.toISOString(),
    counts: {
      students: data.students.length,
      subjects: data.subjects.length,
      classes: data.classes.length,
    },
    data: {
      students: data.students,
      subjects: data.subjects,
      classes: data.classes,
    },
  };
}

/** Nombre del archivo: tutorapp-respaldo-AAAA-MM-DD.json */
export function exportFileName(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `tutorapp-respaldo-${year}-${month}-${day}.json`;
}

/** Dispara la descarga de un JSON en el navegador. */
export function downloadJson(filename: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
