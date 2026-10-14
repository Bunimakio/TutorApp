import { auth, db } from './supabase';
import type { Student } from '@/types';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const MAX_PER_REQUEST = 5;
const MAX_RECIPIENTS_TOTAL = 200;

export interface MailRecipient {
  student_id: string | null;
  name: string;
  email: string;
}

export interface MailFailure {
  email: string;
  student_id: string | null;
  error: string;
}

export interface MailSendResult {
  sent: string[];
  failed: MailFailure[];
}

export interface RecipientGroups {
  sendable: Student[];
  optedOut: Student[];
  withoutEmail: Student[];
}

export function isValidEmail(value?: string | null): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 3 && EMAIL_RE.test(trimmed);
}

export function groupStudents(students: Student[]): RecipientGroups {
  const sendable: Student[] = [];
  const optedOut: Student[] = [];
  const withoutEmail: Student[] = [];

  for (const student of students) {
    const hasEmail = isValidEmail(student.email);
    if (!hasEmail) {
      withoutEmail.push(student);
      continue;
    }
    const wantsEmail = student.notify_email !== false;
    if (wantsEmail) {
      sendable.push(student);
    } else {
      optedOut.push(student);
    }
  }

  return { sendable, optedOut, withoutEmail };
}

export interface PickOptions {
  all: boolean;
  selectedIds: string[];
  /** Incluye los alumnos que pidieron NO recibir (sólo se usa en envío "a mano" con aviso). */
  includeOptedOut?: boolean;
}

export function pickRecipients(students: Student[], options: PickOptions): MailRecipient[] {
  const groups = groupStudents(students);
  const pool: Student[] = [];

  if (options.all) {
    pool.push(...groups.sendable);
    if (options.includeOptedOut) {
      pool.push(...groups.optedOut);
    }
    // withoutEmail: no se incluyen nunca
  } else {
    const set = new Set(options.selectedIds.filter(Boolean));
    if (!set.size) return [];
    for (const s of groups.sendable) {
      if (set.has(s.id)) pool.push(s);
    }
    if (options.includeOptedOut) {
      for (const s of groups.optedOut) {
        if (set.has(s.id)) pool.push(s);
      }
    }
    for (const s of groups.withoutEmail) {
      // Permitimos "elegirlos a mano" pero no se podrán enviar:
      // el modal los marca como "Sin correo" y los deja fuera.
      if (set.has(s.id)) {
        // no enviar: los excluimos aquí también
      }
    }
  }

  const seen = new Set<string>();
  const recipients: MailRecipient[] = [];
  for (const s of pool) {
    const email = String(s.email).trim().toLowerCase();
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      student_id: s.id,
      name: s.full_name,
      email,
    });
    if (recipients.length >= MAX_RECIPIENTS_TOTAL) break;
  }
  return recipients;
}

export interface SendOptions {
  onProgress?: (current: number, total: number) => void;
}

/**
 * Envío del correo a través del endpoint de Cloudflare Pages Functions.
 * Se divide en bloques de MAX_PER_REQUEST para evitar que una petición
 * se quede colgada si hay muchos destinatarios.
 */
export async function sendMessages(
  recipients: MailRecipient[],
  subject: string,
  body: string,
  options: SendOptions = {}
): Promise<MailSendResult> {
  const subjectTrim = subject.trim();
  const bodyTrim = body.trim();

  if (!subjectTrim || !bodyTrim) {
    throw new Error('El asunto y el mensaje son obligatorios.');
  }

  if (!recipients.length) {
    throw new Error('No hay destinatarios para este envío.');
  }

  const token = await auth.getAccessToken();
  if (!token) {
    throw new Error('Tu sesión expiró. Volvé a iniciar sesión para poder enviar correos.');
  }

  const result: MailSendResult = { sent: [], failed: [] };
  const total = recipients.length;
  let sentCount = 0;
  const onProgress = options.onProgress;

  for (let i = 0; i < recipients.length; i += MAX_PER_REQUEST) {
    const chunk = recipients.slice(i, i + MAX_PER_REQUEST);
    if (chunk.length === 0) continue;

    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        subject: subjectTrim,
        body: bodyTrim,
        recipients: chunk,
      }),
    });

    let data: any;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      if (data?.error === 'NOT_CONFIGURED') {
        throw new Error(
          'Falta configurar el correo en el proyecto (GMAIL_USER / GMAIL_APP_PASSWORD). Mirá el README → Mensajería.'
        );
      }
      if (data?.error === 'UNAUTHORIZED') {
        throw new Error('La sesión no es válida o venció. Volvé a iniciar sesión.');
      }
      const message = data?.message || 'No se pudo enviar el correo.';
      throw new Error(message);
    }

    const sent = Array.isArray(data?.sent) ? data.sent : [];
    const failed = Array.isArray(data?.failed) ? data.failed : [];
    for (const s of sent) {
      if (s?.email) result.sent.push(String(s.email).trim().toLowerCase());
    }
    for (const f of failed) {
      result.failed.push({
        email: String(f?.email || '').trim().toLowerCase(),
        student_id: typeof f?.student_id === 'string' ? f.student_id : null,
        error: String(f?.error || 'Error desconocido'),
      });
    }

    sentCount += chunk.length;
    if (onProgress) {
      onProgress(sentCount, total);
    }
  }

  return result;
}

/** Cuenta cuántos correos se enviaron hoy (para informar el límite diario). */
export async function getSentTodayCount(): Promise<number> {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const iso = start.toISOString();
  const { data, error } = await db.messages.getToday(iso);
  if (error || !data) return 0;
  return data.length;
}
