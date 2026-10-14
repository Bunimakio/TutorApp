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

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      students: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
          notify_email: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          notify_email?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          notify_email?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          user_id: string;
          student_id: string | null;
          to_email: string;
          subject: string;
          body: string;
          kind: 'manual' | 'reminder';
          status: 'sent' | 'error';
          error: string | null;
          sent_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id?: string | null;
          to_email: string;
          subject: string;
          body: string;
          kind?: 'manual' | 'reminder';
          status?: 'sent' | 'error';
          error?: string | null;
          sent_at?: string;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
    };
  };
};
