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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      card_arts: {
        Row: {
          created_at: string
          grade: Database["public"]["Enums"]["card_grade"]
          id: string
          room_id: string
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: Database["public"]["Enums"]["card_grade"]
          id?: string
          room_id: string
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: Database["public"]["Enums"]["card_grade"]
          id?: string
          room_id?: string
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_arts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          attitude: boolean
          evaluated_at: string
          evaluated_by: string
          homework: boolean
          id: string
          is_lucky: boolean
          joker_used: boolean
          participation: boolean
          room_id: string
          session_id: string
          student_id: string
          teacher_memo: string
          updated_at: string
        }
        Insert: {
          attitude?: boolean
          evaluated_at?: string
          evaluated_by: string
          homework?: boolean
          id?: string
          is_lucky?: boolean
          joker_used?: boolean
          participation?: boolean
          room_id: string
          session_id: string
          student_id: string
          teacher_memo?: string
          updated_at?: string
        }
        Update: {
          attitude?: boolean
          evaluated_at?: string
          evaluated_by?: string
          homework?: boolean
          id?: string
          is_lucky?: boolean
          joker_used?: boolean
          participation?: boolean
          room_id?: string
          session_id?: string
          student_id?: string
          teacher_memo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_evaluated_by_fkey"
            columns: ["evaluated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_session_id_room_id_fkey"
            columns: ["session_id", "room_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "room_id"]
          },
          {
            foreignKeyName: "evaluations_student_id_room_id_fkey"
            columns: ["student_id", "room_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "room_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          id: string
          item_id: string
          price_paid: number
          requested_at: string
          room_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          student_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id: string
          price_paid: number
          requested_at?: string
          room_id: string
          status?: Database["public"]["Enums"]["purchase_status"]
          student_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id?: string
          price_paid?: number
          requested_at?: string
          room_id?: string
          status?: Database["public"]["Enums"]["purchase_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_item_id_room_id_fkey"
            columns: ["item_id", "room_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id", "room_id"]
          },
          {
            foreignKeyName: "purchases_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_student_id_room_id_fkey"
            columns: ["student_id", "room_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "room_id"]
          },
        ]
      }
      reflections: {
        Row: {
          created_at: string
          id: string
          praise_tags: string[]
          room_id: string
          session_id: string
          struggle_tags: string[]
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          praise_tags?: string[]
          room_id: string
          session_id: string
          struggle_tags?: string[]
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          praise_tags?: string[]
          room_id?: string
          session_id?: string
          struggle_tags?: string[]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reflections_session_id_room_id_fkey"
            columns: ["session_id", "room_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "room_id"]
          },
          {
            foreignKeyName: "reflections_student_id_room_id_fkey"
            columns: ["student_id", "room_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "room_id"]
          },
        ]
      }
      rooms: {
        Row: {
          code_expires_at: string | null
          created_at: string
          end_date: string
          id: string
          join_code: string
          start_date: string
          teacher_id: string
          title: string
          updated_at: string
          weekdays: number[]
        }
        Insert: {
          code_expires_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          join_code: string
          start_date: string
          teacher_id: string
          title: string
          updated_at?: string
          weekdays: number[]
        }
        Update: {
          code_expires_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          join_code?: string
          start_date?: string
          teacher_id?: string
          title?: string
          updated_at?: string
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "rooms_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          id: string
          room_id: string
          session_date: string
          week_no: number
          weekday: number
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          session_date: string
          week_no: number
          weekday: number
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          session_date?: string
          week_no?: number
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          limit_month: number | null
          limit_season: number | null
          name: string
          needs_approval: boolean
          price: number
          room_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          limit_month?: number | null
          limit_season?: number | null
          name: string
          needs_approval?: boolean
          price: number
          room_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          limit_month?: number | null
          limit_season?: number | null
          name?: string
          needs_approval?: boolean
          price?: number
          room_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          auth_user_id: string
          created_at: string
          id: string
          name: string
          room_id: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          id?: string
          name: string
          room_id: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          id?: string
          name?: string
          room_id?: string
          status?: Database["public"]["Enums"]["student_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_reflections: {
        Row: {
          created_at: string
          helpful_factor: string
          id: string
          room_id: string
          student_id: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          helpful_factor: string
          id?: string
          room_id: string
          student_id: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          helpful_factor?: string
          id?: string
          room_id?: string
          student_id?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_reflections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_reflections_student_id_room_id_fkey"
            columns: ["student_id", "room_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "room_id"]
          },
        ]
      }
    }
    Views: {
      evaluation_points: {
        Row: {
          base_points: number | null
          evaluation_id: string | null
          room_id: string | null
          session_id: string | null
          student_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_session_id_room_id_fkey"
            columns: ["session_id", "room_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "room_id"]
          },
          {
            foreignKeyName: "evaluations_student_id_room_id_fkey"
            columns: ["student_id", "room_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "room_id"]
          },
        ]
      }
    }
    Functions: {
      create_room_with_sessions: {
        Args: {
          p_end_date: string
          p_start_date: string
          p_title: string
          p_weekdays: number[]
        }
        Returns: {
          code_expires_at: string | null
          created_at: string
          end_date: string
          id: string
          join_code: string
          start_date: string
          teacher_id: string
          title: string
          updated_at: string
          weekdays: number[]
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_student_id: { Args: { target_room_id: string }; Returns: string }
      is_active_room_student: {
        Args: { target_room_id: string }
        Returns: boolean
      }
      is_room_teacher: { Args: { target_room_id: string }; Returns: boolean }
      join_room: {
        Args: { p_join_code: string; p_name: string }
        Returns: {
          auth_user_id: string
          created_at: string
          id: string
          name: string
          room_id: string
          status: Database["public"]["Enums"]["student_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "students"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      make_join_code: { Args: never; Returns: string }
      request_purchase: {
        Args: { p_item_id: string }
        Returns: {
          decided_at: string | null
          decided_by: string | null
          id: string
          item_id: string
          price_paid: number
          requested_at: string
          room_id: string
          status: Database["public"]["Enums"]["purchase_status"]
          student_id: string
        }
        SetofOptions: {
          from: "*"
          to: "purchases"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      seed_default_shop_items: {
        Args: { target_room_id: string }
        Returns: undefined
      }
      storage_room_id: { Args: { object_name: string }; Returns: string }
    }
    Enums: {
      card_grade: "C" | "U" | "R" | "E" | "L" | "J"
      purchase_status: "pending" | "approved" | "rejected" | "refunded"
      student_status: "pending" | "active" | "revoked"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      card_grade: ["C", "U", "R", "E", "L", "J"],
      purchase_status: ["pending", "approved", "rejected", "refunded"],
      student_status: ["pending", "active", "revoked"],
    },
  },
} as const
