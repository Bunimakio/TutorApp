// Utilidades para armar correos (sin red, para poder probarlas).
// Se usan desde las Pages Functions (Cloudflare) para enviar por SMTP.

const CRLF = '\r\n';

/** Valida una dirección con un criterio simple (no exhaustivo, solo defensivo). */
export function isEmail(value: unknown): boolean {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(value.trim());
}

/** Convierte texto UTF-8 a base64 (para el cuerpo y las cabeceras del correo). */
export function base64OfUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Codifica una cabecera con acentos (RFC 2047) solo si hace falta. */
export function encodeHeader(text: string): string {
  const clean = text.replace(/[\r\n]+/g, ' ').trim();
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7E]*$/.test(clean)) return clean;
  return `=?UTF-8?B?${base64OfUtf8(clean)}?=`;
}

/** Parte un base64 en líneas de 76 caracteres, como pide el formato MIME. */
export function wrapBase64(text: string, width = 76): string {
  const lines: string[] = [];
  for (let i = 0; i < text.length; i += width) {
    lines.push(text.slice(i, i + width));
  }
  return lines.join(CRLF);
}

/** Normaliza los saltos de línea del mensaje a CRLF. */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n|\r|\n/g, CRLF);
}

/** Escapa las líneas que empiezan con punto (fin de DATA en SMTP). */
export function dotStuff(text: string): string {
  return text.replace(/(^|\r\n)\./g, '$1..');
}

/** Dirección con nombre visible: "Nombre" <correo@dominio.com> */
export function formatAddress(name: string, email: string): string {
  const clean = (name || '').trim();
  return clean ? `"${encodeHeader(clean)}" <${email}>` : `<${email}>`;
}

export interface MailContent {
  fromName: string;
  fromEmail: string;
  toName?: string;
  toEmail: string;
  subject: string;
  text: string;
  date?: Date;
  messageId?: string;
}

/** Arma el correo completo (cabeceras + cuerpo en base64) listo para DATA. */
export function buildMessage(content: MailContent): string {
  const domain = content.fromEmail.split('@')[1] || 'localhost';
  const messageId = content.messageId || `<${randomId()}@${domain}>`;
  const date = (content.date || new Date()).toUTCString();

  const headers = [
    `From: ${formatAddress(content.fromName, content.fromEmail)}`,
    `To: ${formatAddress(content.toName || '', content.toEmail)}`,
    `Reply-To: <${content.fromEmail}>`,
    `Subject: ${encodeHeader(content.subject)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ];

  const body = wrapBase64(base64OfUtf8(normalizeNewlines(content.text)));
  return `${headers.join(CRLF)}${CRLF}${CRLF}${body}`;
}

function randomId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `${Date.now()}.${Math.random().toString(36).slice(2)}`;
}

/** Traduce los errores SMTP más comunes a un mensaje entendible. */
export function friendlyMailError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/55[0-9]/.test(raw)) return 'Gmail rechazó esa dirección';
  if (/535/.test(raw)) return 'Gmail rechazó la contraseña de aplicación (revisá la configuración)';
  if (/\b42[0-9]\b/.test(raw)) return 'Gmail pidió esperar un momento (límite de envíos): intentá más tarde';
  if (/timeout|tiempo/i.test(raw)) return 'El servidor de correo tardó demasiado en responder';
  if (/conexión|cerró/i.test(raw)) return 'Se cortó la conexión con Gmail';
  return 'No se pudo enviar el correo';
}
