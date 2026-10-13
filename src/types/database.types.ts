// Tipos generados desde Supabase (ejecuta: npx supabase gen types typescript --project-id TU_PROJECT_ID > src/types/database.types.ts)
// Este es un placeholder - reemplázalo con los tipos reales después de crear las tablas en Supabase

export interface Json {
  [key: string]: Json | Array<Json> | boolean | number | string | null;
}

export interface Database {
  public: {
    Tables: {
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          price: number;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          price?: number;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          price?: number;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          email: string | null;
          phone: string | null;
          notes: string | null;
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
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      classes: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          date: string;
          status: 'pending' | 'paid' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          student_id: string;
          subject_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          date: string;
          status?: 'pending' | 'paid' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          student_id?: string;
          subject_id?: string;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          date?: string;
          status?: 'pending' | 'paid' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'classes_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'students';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'classes_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          }
        ];
      };
      app_settings: {
        Row: {
          id: string;
          user_id: string;
          slot_duration_minutes: number;
          week_start_day: number;
          working_days: number[];
          working_hours_start: string;
          working_hours_end: string;
          default_subject_price: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          slot_duration_minutes?: number;
          week_start_day?: number;
          working_days?: number[];
          working_hours_start?: string;
          working_hours_end?: string;
          default_subject_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          slot_duration_minutes?: number;
          week_start_day?: number;
          working_days?: number[];
          working_hours_start?: string;
          working_hours_end?: string;
          default_subject_price?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_student_stats: {
        Args: { student_uuid: string };
        Returns: {
          total_classes: number;
          total_hours: number;
          classes_last_30_days: number;
          paid_last_30_days: number;
          pending_amount: number;
          last_class_date: string | null;
        }[];
      };
    };
    Enums: {
      class_status: 'pending' | 'paid' | 'cancelled';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}