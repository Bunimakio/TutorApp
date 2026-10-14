// Endpoint de prueba: solo confirma que las Pages Functions se publican bien.
// Se puede borrar cuando la mensajería esté funcionando.
export const onRequestGet = () => {
  return Response.json({ ok: true, service: 'tutorapp-functions', at: new Date().toISOString() });
};
