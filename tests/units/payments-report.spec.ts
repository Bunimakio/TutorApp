// Casos de prueba del informe de pagos que se genera como PDF.
// Verifica el encabezado, el listado de clases del mes, los totales destacados y
// que el contenido con etiquetas HTML se escape (para no romper el documento).
import { describe, expect, it } from 'vitest';
import { buildPaymentsReportHtml } from '@/lib/payments-report';

const classes = [
  {
    status: 'paid',
    date: '2026-10-12',
    start_time: '09:00:00',
    end_time: '11:00:00',
    student: { full_name: 'Ana Gómez' },
    subject: { name: 'Matemática', price: 20 },
  },
  {
    status: 'pending',
    date: '2026-10-11',
    start_time: '10:00:00',
    end_time: '12:00:00',
    student: { full_name: 'Bruno Díaz' },
    subject: { name: 'Física', price: 20 },
  },
  {
    status: 'paid',
    date: '2026-10-10',
    start_time: '11:00:00',
    end_time: '12:30:00',
    student: { full_name: 'Ana Gómez' },
    subject: { name: 'Matemática', price: 20 },
  },
];

function build(overrides: Record<string, any> = {}): string {
  return buildPaymentsReportHtml({
    classes,
    monthLabel: 'octubre de 2026',
    generatedAt: '13 de octubre de 2026',
    user: 'profe@ejemplo.com',
    ...overrides,
  });
}

/** Normaliza los espacios "finos" que mete Intl en los montos. */
function clean(html: string): string {
  return html.replace(/[\u00a0\u202f]/g, ' ');
}

describe('encabezado del informe', () => {
  it('lleva el nombre de la app, el período, la fecha y el usuario', () => {
    const html = clean(build());

    expect(html).toContain('TutorApp');
    expect(html).toContain('Informe de pagos');
    expect(html).toContain('octubre de 2026');
    expect(html).toContain('13 de octubre de 2026');
    expect(html).toContain('profe@ejemplo.com');
  });

  it('es un documento completo, independiente de la app', () => {
    const html = build();

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('<style>');
    expect(html).toContain('@page');
  });
});

describe('listado de clases', () => {
  it('muestra cada clase con su fecha, hora, alumno, asignatura, monto y estado', () => {
    const html = clean(build());

    expect(html).toContain('12/10/2026');
    expect(html).toContain('11/10/2026');
    expect(html).toContain('10/10/2026');
    expect(html).toContain('09:00');
    expect(html).toContain('Ana Gómez');
    expect(html).toContain('Bruno Díaz');
    expect(html).toContain('Matemática');
    expect(html).toContain('Física');
    expect(html).toContain('40,00 €');
    expect(html).toContain('40,00 €');
    expect(html).toContain('30,00 €');
    expect(html).toContain('Pagado');
    expect(html).toContain('Pendiente');
  });

  it('avisa cuando el mes no tiene clases', () => {
    const html = clean(build({ classes: [] }));

    expect(html).toContain('No hubo clases en octubre de 2026.');
    expect(html).not.toContain('<tbody>');
  });
});

describe('totales destacados', () => {
  it('resume cobrado, pendiente, total, horas y cantidad de clases', () => {
    const html = clean(build());

    expect(html).toContain('Total ganado (cobrado)');
    expect(html).toContain('70,00 €');
    expect(html).toContain('Pendiente de cobro');
    expect(html).toContain('40,00 €');
    expect(html).toContain('Horas dictadas');
    expect(html).toContain('5,5 h');
    expect(html).toMatch(/Clases dictadas<\/p>\s*<p class="value">3<\/p>/);
    expect(html).toContain('Total del mes (cobrado + pendiente):');
    expect(html).toContain('110,00 €');
  });

  it('deja los totales en cero si no hubo clases', () => {
    const html = clean(build({ classes: [] }));

    expect(html).toMatch(/Clases dictadas<\/p>\s*<p class="value">0<\/p>/);
    expect(html).toContain('0,00 €');
  });

  it('usa el color de la app para destacar el resumen', () => {
    const html = build();

    expect(html).toContain('background: #fef7ee');
    expect(html).toContain('color: #b84209');
  });
});

describe('seguridad del documento', () => {
  it('escapa el HTML de los nombres', () => {
    const html = build({
      user: '<script>alert(1)</script>',
      classes: [
        {
          status: 'paid',
          date: '2026-10-12',
          start_time: '09:00',
          end_time: '10:00',
          student: { full_name: '<b>Ana</b>' },
          subject: { name: 'Mate & Física', price: 10 },
        },
      ],
    });

    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(html).toContain('Mate &amp; Física');
  });
});
