// Utilidad para guardar datos en IndexedDB.
//
// IndexedDB serializa con structuredClone, que NO puede clonar los Proxies
// reactivos de Vue. Cuando iteramos arrays reactivos (p. ej. `students.value`)
// obtenemos Proxies y `put()` lanza DataCloneError. Serializar a un objeto
// plano evita ese error.
export function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}
