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
  views/        pantallas (calendario, alumnos, ajustes, admin, login)
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
