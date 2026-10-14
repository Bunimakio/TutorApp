// Prueba técnica: abre un socket TCP contra Gmail (sin credenciales) y lee el
// saludo del servidor. Sirve para confirmar que el runtime de Pages Functions
// permite conexiones SMTP, que es lo que necesita el envío de correos.
// Se puede borrar cuando la mensajería esté funcionando.
import { connect } from 'cloudflare:sockets';

export const onRequestGet = async () => {
  let socket: Socket | undefined;
  try {
    socket = connect({ hostname: 'smtp.gmail.com', port: 465 }, { secureTransport: 'on' });
    const reader = socket.readable.getReader();
    const { value } = await reader.read();
    const banner = new TextDecoder().decode(value || new Uint8Array()).trim();
    reader.releaseLock();
    socket.close();
    return Response.json({ ok: banner.startsWith('220'), banner });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
};
