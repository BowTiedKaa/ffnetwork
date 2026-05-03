export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string
          duration_months: number
          id: string
          is_active: boolean
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          duration_months: number
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          duration_months?: number
          id?: string
          is_active?: boolean
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          archived_at: string | null
          created_at: string | null
          id: string
          industry: string | null
          is_archived: boolean | null
          name: string
          notes: string | null
          priority: number | null
          revenue_role: boolean | null
          target_role: string | null
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          is_archived?: boolean | null
          name: string
          notes?: string | null
          priority?: number | null
          revenue_role?: boolean | null
          target_role?: string | null
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          is_archived?: boolean | null
          name?: string
          notes?: string | null
          priority?: number | null
          revenue_role?: boolean | null
          target_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          archived_at: string | null
          company: string | null
          company_id: string | null
          connector_influence_company_ids: string[] | null
          contact_type: string
          created_at: string | null
          email: string | null
          id: string
          is_archived: boolean | null
          last_contact_date: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          recruiter_specialization: string | null
          role: string | null
          user_id: string
          warmth_level: string | null
        }
        Insert: {
          archived_at?: string | null
          company?: string | null
          company_id?: string | null
          connector_influence_company_ids?: string[] | null
          contact_type?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          last_contact_date?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          recruiter_specialization?: string | null
          role?: string | null
          user_id: string
          warmth_level?: string | null
        }
        Update: {
          archived_at?: string | null
          company?: string | null
          company_id?: string | null
          connector_influence_company_ids?: string[] | null
          contact_type?: string
          created_at?: string | null
          email?: string | null
          id?: string
          is_archived?: boolean | null
          last_contact_date?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          recruiter_specialization?: string | null
          role?: string | null
          user_id?: string
          warmth_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          company_id: string | null
          completed: boolean | null
          contact_id: string | null
          created_at: string | null
          description: string
          due_date: string | null
          id: string
          task_type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          completed?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          description: string
          due_date?: string | null
          id?: string
          task_type: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          completed?: boolean | null
          contact_id?: string | null
          created_at?: string | null
          description?: string
          due_date?: string | null
          id?: string
          task_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          contact_id: string
          created_at: string | null
          due_date: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          contact_id: string
          created_at?: string | null
          due_date: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          contact_id?: string
          created_at?: string | null
          due_date?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          interaction_date: string
          interaction_type: string
          notes: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type: string
          notes?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          interaction_date?: string
          interaction_type?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_pathways: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          notes: string | null
          status: string | null
          target_company_id: string | null
          target_person: string | null
          user_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          target_company_id?: string | null
          target_person?: string | null
          user_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          target_company_id?: string | null
          target_person?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intro_pathways_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intro_pathways_target_company_id_fkey"
            columns: ["target_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_code_used: string | null
          agency: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_approved: boolean
          pitch: string | null
          target_role_seeking: string | null
          tier: string
          tier_expires_at: string | null
          years_of_service: string | null
        }
        Insert: {
          access_code_used?: string | null
          agency?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_approved?: boolean
          pitch?: string | null
          target_role_seeking?: string | null
          tier?: string
          tier_expires_at?: string | null
          years_of_service?: string | null
        }
        Update: {
          access_code_used?: string | null
          agency?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_approved?: boolean
          pitch?: string | null
          target_role_seeking?: string | null
          tier?: string
          tier_expires_at?: string | null
          years_of_service?: string | null
        }
        Relationships: []
      }
      streaks: {
        Row: {
          created_at: string | null
          current_streak: number | null
          id: string
          last_activity_date: string | null
          longest_streak: number | null
          total_tasks_completed: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_tasks_completed?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_streak?: number | null
          id?: string
          last_activity_date?: string | null
          longest_streak?: number | null
          total_tasks_completed?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_access_codes: {
        Args: { _count: number; _duration_months: number }
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_access_code: { Args: { _code: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
