// Cliente SMTP mínimo para Cloudflare Workers/Pages (usa sockets TCP + TLS).
// Alcanza para lo que necesita la app: autenticarse con Gmail y mandar un
// correo por vez (una conexión por destinatario, así un error no afecta al resto).
import { connect } from 'cloudflare:sockets';
import { base64OfUtf8, dotStuff } from './_mail';

const CRLF = '\r\n';

export interface SmtpOptions {
  host: string;
  port: number;
  user: string;
  pass: string;
  /** Tiempo máximo de espera por respuesta del servidor (ms). */
  timeoutMs?: number;
}

export interface OutgoingMail {
  to: string;
  /** Correo completo (cabeceras + cuerpo), sin el punto final de DATA. */
  message: string;
}

interface SmtpResponse {
  code: number;
  lines: string[];
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

class SmtpClient {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private decoder = new TextDecoder();
  private encoder = new TextEncoder();
  private buffer = '';

  constructor(private socket: any) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  private async readChunk(timeoutMs: number): Promise<string> {
    const result = await withTimeout(
      this.reader.read(),
      timeoutMs,
      'El servidor de correo no respondió a tiempo (timeout)'
    );
    if (result.done) throw new Error('El servidor de correo cerró la conexión');
    return this.decoder.decode(result.value, { stream: true });
  }

  private async readLine(timeoutMs: number): Promise<string> {
    for (;;) {
      const index = this.buffer.indexOf('\n');
      if (index >= 0) {
        const line = this.buffer.slice(0, index).replace(/\r$/, '');
        this.buffer = this.buffer.slice(index + 1);
        return line;
      }
      this.buffer += await this.readChunk(timeoutMs);
    }
  }

  /** Lee una respuesta completa (los mensajes multilínea usan "250-..."). */
  async readResponse(timeoutMs: number): Promise<SmtpResponse> {
    const lines: string[] = [];
    for (;;) {
      const line = await this.readLine(timeoutMs);
      lines.push(line);
      if (line.length < 4 || line[3] !== '-') break;
    }
    const last = lines[lines.length - 1] || '';
    return { code: Number(last.slice(0, 3)), lines };
  }

  async write(text: string, timeoutMs: number): Promise<void> {
    await withTimeout(
      this.writer.write(this.encoder.encode(text)),
      timeoutMs,
      'No se pudo enviar datos al servidor de correo (timeout)'
    );
  }

  /** Manda un comando y verifica que la respuesta sea una de las esperadas. */
  async command(command: string, expected: number[], timeoutMs: number): Promise<SmtpResponse> {
    await this.write(`${command}${CRLF}`, timeoutMs);
    const response = await this.readResponse(timeoutMs);
    if (!expected.includes(response.code)) {
      throw smtpError(response);
    }
    return response;
  }

  close(): void {
    try {
      this.socket.close();
    } catch {
      // La conexión ya podía estar cerrada.
    }
  }
}

/** Mensaje de error legible a partir de una respuesta SMTP inesperada. */
function smtpError(response: SmtpResponse): Error {
  const detail = response.lines[response.lines.length - 1] || 'sin respuesta';
  return new Error(`SMTP ${response.code || '???'}: ${detail}`);
}

/** Envía el cuerpo del mensaje (termina en la línea con un punto). */
async function writeData(client: SmtpClient, message: string, timeoutMs: number): Promise<void> {
  await client.write(`${dotStuff(message)}${CRLF}.${CRLF}`, timeoutMs);
  const response = await client.readResponse(timeoutMs);
  if (response.code !== 250) throw smtpError(response);
}

/** Envía un correo. Lanza un Error si el servidor lo rechaza. */
export async function sendMail(options: SmtpOptions, mail: OutgoingMail): Promise<void> {
  const timeout = options.timeoutMs ?? 20000;
  const socket = connect({ hostname: options.host, port: options.port }, { secureTransport: 'on' });
  const client = new SmtpClient(socket);

  try {
    const banner = await client.readResponse(timeout);
    if (banner.code !== 220) throw smtpError(banner);

    await client.command('EHLO tutorapp', [250], timeout);
    await client.command('AUTH LOGIN', [334], timeout);
    await client.command(base64OfUtf8(options.user), [334], timeout);
    await client.command(base64OfUtf8(options.pass), [235], timeout);
    await client.command(`MAIL FROM:<${options.user}>`, [250], timeout);
    await client.command(`RCPT TO:<${mail.to}>`, [250, 251], timeout);
    await client.command('DATA', [354], timeout);

    await writeData(client, mail.message, timeout);

    // QUIT puede fallar sin que importe: el correo ya salió.
    await client.command('QUIT', [221], timeout).catch(() => undefined);
  } finally {
    client.close();
  }
}
