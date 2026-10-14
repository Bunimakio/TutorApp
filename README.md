# TutorApp

Agenda de clases particulares con calendario semanal y registro de alumnos.

Aplicación de escritorio (web) hecha con **Vue 3 + TypeScript + Vite + Pinia + Tailwind CSS**.
El backend y la autenticación viven en **Supabase** (no hay servidor propio).

## Estado

- Sitio publicado: https://tutorapp-9z3.pages.dev
- Hosting: Cloudflare Pages (plan gratuito)
- Base de datos / Auth: Supabase (`dvmccwwbqqjwnmcckgzt`)

## Requisitos

- Node.js 18+ (probado en Node 19)
- Una cuenta de Supabase con las tablas `students`, `subjects` y `classes`

## Puesta en marcha (local)

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Crear `.env.local` en la raíz (no se versiona) con:

   ```
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<tu-anon-key>
   ```

   Las credenciales están en Supabase → Project Settings → API.

3. Levantar el entorno de desarrollo:

   ```bash
   npm run dev
   ```

   > Para probarlo desde el celular en la misma red Wi-Fi: `node serve.cjs` (sirve `dist/` en
   > `0.0.0.0:3000` y muestra la dirección LAN).

## Compilar

```bash
npx vite build --mode development
```

> Se usa este comando (y no `npm run build`) porque `npm run build` ejecuta `vue-tsc`, que
> falla con la versión de Node actual del equipo. El resultado queda en `dist/`.

## Pago de las clases

El pago se confirma con la casilla **"Abonado (pago confirmado)"** del formulario de la
clase. Es definitivo y no se puede deshacer.

Una clase abonada ya se dictó, así que queda **solo para ver**: al abrirla no se puede
cambiar el alumno ni ningún otro dato (asignatura, día, horario, fecha, notas). El mismo
control existe en el store de clases, por si llega un cambio desde otro lado. Mientras se
confirma el pago (clase pendiente con la casilla marcada) los campos se bloquean para que
el alumno no cambie en la misma acción.

Una clase **pendiente** sí se puede editar, incluido el alumno (por ejemplo para corregir
un alumno mal cargado): el cambio se guarda. Una clase pendiente puede estar todavía en el
futuro (el alumno no está obligado a pagar antes) o ya dictada y sin cobrar. Confirmar el
pago y cancelar una clase que no se dictó los decide siempre el usuario a mano: la app no
lo hace sola.

## Pagos

La sección **Pagos** (en el menú, entre Asignaturas y Configuración) tiene dos partes:

- **Últimos pagos**: las 10 clases más recientes (pagadas y pendientes; las canceladas
  no se muestran) con fecha y hora, alumno, asignatura, monto y condición. Se pueden
  filtrar por alumno, asignatura o fecha.
- **Informe del mes** (no se muestra en la página): el botón **Imprimir / Guardar PDF**
  genera un documento aparte con encabezado (nombre de la app, usuario, fecha y período),
  todas las clases del mes ordenadas por fecha y un cuadro destacado con el total ganado,
  lo pendiente de cobro, las horas y la cantidad de clases. Luego se elige
  "Guardar como PDF" en el diálogo del navegador. El mes se puede cambiar con el selector.

## Pruebas

```bash
npm test          # corre los tests una vez
npm run test:watch  # modo interactivo
```

Son tests automáticos (Vitest + @vue/test-utils) que cubren el pago de las clases
(la casilla "Abonado" es definitiva y no se puede deshacer, y una clase abonada queda
solo para ver), el "Total abonado" de
cada alumno, el estado "Al día" / "Pendiente de cobro", la sección de Pagos (últimos
10 pagos, filtros, informe del mes y el cálculo del último día del mes, incluido febrero
en año bisiesto) y el calendario del celular (un día por vez). Están en `tests/`.

## Datos de prueba

En **Ajustes → Datos de prueba** hay dos botones:

- **Cargar datos de prueba**: crea 7 alumnos, sus clases (pagadas, pendientes y
  canceladas) y los pagos de ejemplo para probar el sistema con varios alumnos.
- **Borrar datos de prueba**: elimina todo lo que haya creado.

Todo lo que se crea lleva el prefijo `[DEMO] ` en el nombre, así se distingue de los
datos reales y se puede borrar en un solo paso.

## Publicar

### Automático (recomendado)

Cada `push` a la rama `main` dispara el workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), que compila y sube la app
a Cloudflare Pages.

Requiere estos *secrets* en el repositorio (Settings → Secrets and variables → Actions):

| Secret | Para qué sirve |
| --- | --- |
| `VITE_SUPABASE_URL` | URL del proyecto Supabase (se compila dentro de la app) |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (anon) de Supabase |
| `CLOUDFLARE_API_TOKEN` | Token de Cloudflare con permiso *Account → Cloudflare Pages → Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | ID de la cuenta de Cloudflare |

### Manual (respaldo)

Doble clic en `publicar.cmd`: compila y sube con `wrangler` desde la PC.

## Estructura

```
src/
  components/   componentes de UI y del calendario
  views/        pantallas (calendario, alumnos, asignaturas, pagos, ajustes, login)
  stores/       estado con Pinia (clases, alumnos, materias, tema, auth)
  lib/          cliente de Supabase, iconos, IndexedDB
public/         archivos estáticos (iconos, manifest, _redirects)
```

## Notas

- `public/_redirects` es necesario para que las rutas del SPA (`/login`, `/settings`, ...)
  funcionen al entrar directo o recargar.
- El tema claro/oscuro se guarda en `localStorage` (`tutorapp-theme`).
- Los dominios desde los que se usa la app deben estar autorizados en Supabase →
  Authentication → URL Configuration, para que funcionen los enlaces de los mails.
