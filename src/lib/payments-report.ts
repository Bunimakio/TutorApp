// Genera el HTML del informe de pagos que se manda a imprimir o guardar como PDF.
// Es un documento completo e independiente de la app (sus propios estilos), así el
// PDF sale siempre con el diseño y los colores esperados.
import {
  classAmount,
  classHours,
  formatCurrency,
  formatDate,
  formatHours,
  formatTime,
} from '@/lib/payments';

/** Datos mínimos que necesita el informe de una clase. */
export interface ReportClass {
  status: string;
  date: string;
  start_time: string;
  end_time: string;
  student?: { full_name?: string | null } | null;
  subject?: { name?: string | null; price?: number | null } | null;
}

export interface ReportOptions {
  /** Todas las clases del mes (ya sin las canceladas). */
  classes: ReportClass[];
  /** Período, por ejemplo "octubre de 2026". */
  monthLabel: string;
  /** Fecha en que se genera el informe. */
  generatedAt: string;
  /** Usuario que pide el informe. */
  user: string;
}

function escapeHtml(value: string | null | undefined): string {
  return (value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const REPORT_STYLES = `
  * { box-sizing: border-box; }
  html, body { background: #fff; }
  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #111827;
    font-size: 13px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    border-bottom: 2px solid #ed7311;
    padding-bottom: 18px;
    margin-bottom: 22px;
  }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo {
    width: 44px; height: 44px; border-radius: 12px;
    background: #ed7311; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; font-weight: 700;
  }
  .brand-name { margin: 0; font-size: 20px; font-weight: 700; line-height: 1.2; }
  .brand-sub { margin: 0; font-size: 12.5px; color: #6b7280; }
  .meta { font-size: 12.5px; color: #4b5563; }
  .meta p { margin: 0 0 2px; }
  .meta b { color: #111827; }
  table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  thead th {
    background: #f9fafb;
    color: #6b7280;
    text-transform: uppercase;
    font-size: 10.5px;
    letter-spacing: 0.05em;
    text-align: left;
    padding: 8px 10px;
  }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
  .right { text-align: right; }
  .nowrap { white-space: nowrap; }
  .strong { font-weight: 600; }
  .muted { color: #4b5563; }
  .tag {
    display: inline-block; padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 600;
  }
  .tag-paid { background: #dcfce7; color: #166534; }
  .tag-pending { background: #fef3c7; color: #92400e; }
  .summary {
    margin-top: 26px;
    border: 1px solid #fad6ad;
    background: #fef7ee;
    border-radius: 12px;
    padding: 18px;
  }
  .summary h3 {
    margin: 0 0 14px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #b84209;
  }
  .grid { display: flex; flex-wrap: wrap; gap: 14px 28px; }
  .grid > div { min-width: 128px; }
  .label { margin: 0; font-size: 11px; color: #6b7280; }
  .value { margin: 3px 0 0; font-size: 20px; font-weight: 700; color: #b84209; }
  .total-line {
    margin: 16px 0 0; padding-top: 12px;
    border-top: 1px solid #fad6ad;
    font-size: 12.5px; color: #93460f;
  }
  .empty { padding: 28px 0; text-align: center; color: #6b7280; }
  footer {
    margin-top: 26px; padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 11px; color: #9ca3af; text-align: center;
  }
  @page { margin: 14mm; }
  @media print {
    tr, .summary { break-inside: avoid; page-break-inside: avoid; }
  }
`;

export function buildPaymentsReportHtml(options: ReportOptions): string {
  const { classes, monthLabel, generatedAt, user } = options;

  let paidTotal = 0;
  let pendingTotal = 0;
  let hours = 0;

  for (const cls of classes) {
    hours += classHours(cls);
    const amount = classAmount(cls);
    if (cls.status === 'paid') paidTotal += amount;
    else pendingTotal += amount;
  }

  const rows = classes
    .map(cls => {
      const isPaid = cls.status === 'paid';
      return `
        <tr>
          <td class="nowrap">${formatDate(cls.date)}</td>
          <td class="nowrap muted">${formatTime(cls.start_time)}</td>
          <td>${escapeHtml(cls.student?.full_name) || 'Alumno'}</td>
          <td class="muted">${escapeHtml(cls.subject?.name) || 'Sin asignatura'}</td>
          <td class="right nowrap muted">${formatHours(classHours(cls))} h</td>
          <td class="right nowrap strong">${formatCurrency(classAmount(cls))}</td>
          <td><span class="tag ${isPaid ? 'tag-paid' : 'tag-pending'}">${isPaid ? 'Pagado' : 'Pendiente'}</span></td>
        </tr>`;
    })
    .join('');

  const content = classes.length
    ? `
      <table>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Hora</th>
            <th>Alumno</th>
            <th>Asignatura</th>
            <th class="right">Duración</th>
            <th class="right">Monto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`
    : `<p class="empty">No hubo clases en ${escapeHtml(monthLabel)}.</p>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Informe de pagos — ${escapeHtml(monthLabel)}</title>
  <style>${REPORT_STYLES}</style>
</head>
<body>
  <header>
    <div class="brand">
      <div class="logo">T</div>
      <div>
        <p class="brand-name">TutorApp</p>
        <p class="brand-sub">Informe de pagos</p>
      </div>
    </div>
    <div class="meta">
      <p><b>Período:</b> ${escapeHtml(monthLabel)}</p>
      <p><b>Fecha del informe:</b> ${escapeHtml(generatedAt)}</p>
      <p><b>Usuario:</b> ${escapeHtml(user)}</p>
    </div>
  </header>

  ${content}

  <section class="summary">
    <h3>Resumen del mes</h3>
    <div class="grid">
      <div>
        <p class="label">Total ganado (cobrado)</p>
        <p class="value">${formatCurrency(paidTotal)}</p>
      </div>
      <div>
        <p class="label">Pendiente de cobro</p>
        <p class="value">${formatCurrency(pendingTotal)}</p>
      </div>
      <div>
        <p class="label">Horas dictadas</p>
        <p class="value">${formatHours(hours)} h</p>
      </div>
      <div>
        <p class="label">Clases dictadas</p>
        <p class="value">${classes.length}</p>
      </div>
    </div>
    <p class="total-line">
      Total del mes (cobrado + pendiente):
      <b>${formatCurrency(paidTotal + pendingTotal)}</b>
    </p>
  </section>

  <footer>TutorApp — informe generado el ${escapeHtml(generatedAt)}</footer>
</body>
</html>`;
}
