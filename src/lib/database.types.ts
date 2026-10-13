// Tipos de la base de datos Supabase.
// Permisivo a propósito: la app funciona sin generación de tipos.
// Para tipos estrictos ejecuta: supabase gen types typescript --project-id <ref> > src/lib/database.types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = any;
