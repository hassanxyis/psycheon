/**
 * Database types, hand-written to match supabase/migrations/*.sql.
 *
 * Regenerate from the live schema once the Supabase CLI is authenticated:
 *   npx supabase login
 *   npx supabase gen types typescript --project-id <ref> --schema public > src/lib/types/database.ts
 *
 * Keep this file in sync with the migrations until then.
 */

export type UserRole = "user" | "admin";
export type PostStatus = "published" | "hidden" | "removed";
export type BookingStatus = "pending" | "paid" | "cancelled" | "completed";
export type ReportStatus = "open" | "reviewing" | "resolved" | "dismissed";
export type ReportTarget = "post" | "comment";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string;
          avatar_url?: string | null;
          bio?: string | null;
          role?: UserRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          id: string;
          author_id: string;
          title: string;
          body: string;
          tags: string[];
          status: PostStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          title: string;
          body: string;
          tags?: string[];
          status?: PostStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          body?: string;
          tags?: string[];
          status?: PostStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          body?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      psychologists: {
        Row: {
          id: string;
          name: string;
          credentials: string;
          specialties: string[];
          bio: string | null;
          photo_url: string | null;
          is_active: boolean;
          years_experience: number | null;
          languages: string[];
          session_fee: number | null;
          location: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          credentials: string;
          specialties?: string[];
          bio?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          years_experience?: number | null;
          languages?: string[];
          session_fee?: number | null;
          location?: string | null;
        };
        Update: {
          name?: string;
          credentials?: string;
          specialties?: string[];
          bio?: string | null;
          photo_url?: string | null;
          is_active?: boolean;
          years_experience?: number | null;
          languages?: string[];
          session_fee?: number | null;
          location?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      availability: {
        Row: {
          id: string;
          psychologist_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          psychologist_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          psychologist_id: string;
          slot_time: string;
          status: BookingStatus;
          notes: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          psychologist_id: string;
          slot_time: string;
          status?: BookingStatus;
          notes?: string | null;
        };
        Update: {
          slot_time?: string;
          status?: BookingStatus;
          notes?: string | null;
          payment_provider?: string | null;
          payment_ref?: string | null;
          paid_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          target_type: ReportTarget;
          target_id: string;
          reporter_id: string;
          reason: string;
          status: ReportStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          target_type: ReportTarget;
          target_id: string;
          reporter_id: string;
          reason: string;
          status?: ReportStatus;
        };
        Update: {
          status?: ReportStatus;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      post_status: PostStatus;
      booking_status: BookingStatus;
      report_status: ReportStatus;
      report_target: ReportTarget;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Profile = Tables<"profiles">;
export type Post = Tables<"posts">;
export type Comment = Tables<"comments">;
export type Like = Tables<"likes">;
export type Psychologist = Tables<"psychologists">;
export type Availability = Tables<"availability">;
export type Booking = Tables<"bookings">;
export type Report = Tables<"reports">;
