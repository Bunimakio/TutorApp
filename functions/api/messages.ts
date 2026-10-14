// Endpoint de mensajería: recibe la lista de destinatarios desde la app y envía
// los correos con la cuenta de Gmail del usuario (contraseña de aplicación).
//
// Las credenciales viven en las variables de entorno de Cloudflare Pages, nunca
// en el navegador. Ver README → "Mensajería" para configurarlas.
import { buildMessage, friendlyMailError, isEmail } from './_mail';
import { sendMail } from './_smtp';

interface Env {
  /** Cuenta de Gmail desde la que se envía (ej: tunombre@gmail.com). */
  GMAIL_USER?: string;
  /** Contraseña de aplicación de Google (16 caracteres). */
  GMAIL_APP_PASSWORD?: string;
  /** Nombre visible del remitente (opcional). */
  MAIL_FROM_NAME?: string;
  /** URL del proyecto de Supabase (https://xxxx.supabase.co). */
  SUPABASE_URL?: string;
  /** Clave anónima de Supabase (opcional: solo si el gateway la exige). */
  SUPABASE_ANON_KEY?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const GMAIL_HOST = 'smtp.gmail.com';
const GMAIL_PORT = 465;
/** Tope de destinatarios por pedido (la app manda de a 5). */
const MAX_RECIPIENTS = 25;
const MAX_SUBJECT = 200;
const MAX_BODY = 10000;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/** GET /api/messages: sirve para comprobar que el servicio está publicado. */
export const onRequestGet = async ({ env }: Context) => {
  return json({
    ok: true,
    service: 'TutorApp · mensajería',
    configured: Boolean(env.GMAIL_USER && env.GMAIL_APP_PASSWORD && env.SUPABASE_URL),
  });
};

export const onRequestPost = async ({ request, env }: Context) => {
  const config = readConfig(env);
  if (!config.ok) return json({ error: 'NOT_CONFIGURED', message: config.message }, 503);

  const session = await verifySession(request, env);
  if (!session.ok) return json({ error: 'UNAUTHORIZED', message: session.message }, 401);

  const payload = await readPayload(request);
  if (!payload.ok) return json({ error: 'BAD_REQUEST', message: payload.message }, 400);

  const sent: Array<{ email: string; student_id: string | null }> = [];
  const failed: Array<{ email: string; student_id: string | null; error: string }> = [];

  for (const recipient of payload.recipients) {
    const message = buildMessage({
      fromName: config.fromName,
      fromEmail: config.user,
      toName: recipient.name,
      toEmail: recipient.email,
      subject: payload.subject,
      text: payload.body,
    });

    try {
      await sendMail(
        { host: GMAIL_HOST, port: GMAIL_PORT, user: config.user, pass: config.pass, timeoutMs: 20000 },
        { to: recipient.email, message }
      );
      sent.push({ email: recipient.email, student_id: recipient.student_id });
    } catch (error) {
      console.error(`[mensajería] No se pudo enviar a ${recipient.email}:`, error);
      failed.push({ email: recipient.email, student_id: recipient.student_id, error: friendlyMailError(error) });
    }
  }

  return json({ sent, failed }, 200);
};

function readConfig(env: Env):
  | { ok: true; user: string; pass: string; fromName: string }
  | { ok: false; message: string } {
  const user = (env.GMAIL_USER || '').trim();
  // Google muestra la contraseña de aplicación con espacios: los sacamos.
  const pass = (env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  const fromName = (env.MAIL_FROM_NAME || '').trim() || 'Clases particulares';

  if (!env.SUPABASE_URL) {
    return { ok: false, message: 'Falta configurar SUPABASE_URL en Cloudflare Pages (README → Mensajería).' };
  }
  if (!user || !pass) {
    return {
      ok: false,
      message: 'Falta configurar GMAIL_USER y GMAIL_APP_PASSWORD en Cloudflare Pages (README → Mensajería).',
    };
  }
  return { ok: true, user, pass, fromName };
}

async function verifySession(request: Request, env: Env): Promise<{ ok: boolean; message: string }> {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, message: 'Falta la sesión del usuario.' };

  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (env.SUPABASE_ANON_KEY) headers.apikey = env.SUPABASE_ANON_KEY;

  try {
    const response = await fetch(`${(env.SUPABASE_URL || '').replace(/\/+$/, '')}/auth/v1/user`, { headers });
    if (response.ok) return { ok: true, message: '' };
    return { ok: false, message: 'La sesión no es válida o venció. Volvé a iniciar sesión.' };
  } catch (error) {
    console.error('[mensajería] Error al validar la sesión:', error);
    return { ok: false, message: 'No se pudo validar la sesión.' };
  }
}

interface Recipient {
  email: string;
  name: string;
  student_id: string | null;
}

async function readPayload(request: Request): Promise<
  { ok: true; subject: string; body: string; recipients: Recipient[] } | { ok: false; message: string }
> {
  let raw: any;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, message: 'No se pudo leer el contenido del pedido.' };
  }

  const subject = String(raw?.subject ?? '').trim();
  const body = String(raw?.body ?? '').trim();
  const list = Array.isArray(raw?.recipients) ? raw.recipients : [];

  if (!subject || subject.length > MAX_SUBJECT) return { ok: false, message: 'El asunto es obligatorio (máx. 200 caracteres).' };
  if (!body || body.length > MAX_BODY) return { ok: false, message: 'El mensaje es obligatorio (máx. 10000 caracteres).' };
  if (!list.length) return { ok: false, message: 'No hay destinatarios.' };
  if (list.length > MAX_RECIPIENTS) return { ok: false, message: `Se pueden enviar hasta ${MAX_RECIPIENTS} correos por vez.` };

  const seen = new Set<string>();
  const recipients: Recipient[] = [];
  for (const item of list) {
    const email = String(item?.email ?? '').trim().toLowerCase();
    if (!isEmail(email) || seen.has(email)) continue;
    seen.add(email);
    recipients.push({
      email,
      name: String(item?.name ?? '').trim().slice(0, 120),
      student_id: typeof item?.student_id === 'string' ? item.student_id : null,
    });
  }

  if (!recipients.length) return { ok: false, message: 'No hay direcciones de correo válidas.' };
  return { ok: true, subject, body, recipients };
}
