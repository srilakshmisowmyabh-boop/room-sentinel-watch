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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_by: string | null
          confidence: number | null
          created_at: string
          device_id: string | null
          id: string
          kind: string
          message: string
          mode: string | null
          room: string | null
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          confidence?: number | null
          created_at?: string
          device_id?: string | null
          id?: string
          kind?: string
          message: string
          mode?: string | null
          room?: string | null
        }
        Update: {
          acknowledged?: boolean
          acknowledged_by?: string | null
          confidence?: number | null
          created_at?: string
          device_id?: string | null
          id?: string
          kind?: string
          message?: string
          mode?: string | null
          room?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alerts_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      device_keys: {
        Row: {
          created_at: string
          device_id: string
          key_hash: string
        }
        Insert: {
          created_at?: string
          device_id: string
          key_hash: string
        }
        Update: {
          created_at?: string
          device_id?: string
          key_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_keys_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: true
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          id: string
          last_seen: string | null
          name: string
          room: string
          signal_strength: number | null
          status: string
          uptime_seconds: number
        }
        Insert: {
          created_at?: string
          id: string
          last_seen?: string | null
          name: string
          room: string
          signal_strength?: number | null
          status?: string
          uptime_seconds?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_seen?: string | null
          name?: string
          room?: string
          signal_strength?: number | null
          status?: string
          uptime_seconds?: number
        }
        Relationships: []
      }
      presence_events: {
        Row: {
          confidence: number
          device_id: string
          id: string
          mode: string | null
          room: string
          signal_strength: number | null
          state: string
          ts: string
        }
        Insert: {
          confidence: number
          device_id: string
          id?: string
          mode?: string | null
          room: string
          signal_strength?: number | null
          state: string
          ts?: string
        }
        Update: {
          confidence?: number
          device_id?: string
          id?: string
          mode?: string | null
          room?: string
          signal_strength?: number | null
          state?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "presence_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      security_state: {
        Row: {
          entry_delay: number
          exit_delay: number
          id: number
          mode: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          entry_delay?: number
          exit_delay?: number
          id?: number
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          entry_delay?: number
          exit_delay?: number
          id?: number
          mode?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          alarm_duration: number
          clear_time: number
          id: number
          persistence: number
          telegram: boolean
          threshold: number
          updated_at: string
        }
        Insert: {
          alarm_duration?: number
          clear_time?: number
          id?: number
          persistence?: number
          telegram?: boolean
          threshold?: number
          updated_at?: string
        }
        Update: {
          alarm_duration?: number
          clear_time?: number
          id?: number
          persistence?: number
          telegram?: boolean
          threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      signup_state: {
        Row: {
          id: number
          owner_claimed: boolean
        }
        Insert: {
          id?: number
          owner_claimed?: boolean
        }
        Update: {
          id?: number
          owner_claimed?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          revoked_at?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      viewer_invites: {
        Row: {
          created_at: string
          created_by: string
          id: string
          key_hash: string
          name: string
          revoked_at: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          key_hash: string
          name: string
          revoked_at?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          key_hash?: string
          name?: string
          revoked_at?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      device_has_key: { Args: { _device_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      list_viewers: {
        Args: never
        Returns: {
          account_created_at: string
          email: string
          id: string
          last_sign_in_at: string
          name: string
          passkey_status: string
          revoked_at: string
          user_id: string
        }[]
      }
      revoke_viewer: { Args: { _id: string }; Returns: string }
      rotate_device_key: { Args: { _device_id: string }; Returns: string }
    }
    Enums: {
      app_role: "owner" | "viewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "viewer"],
    },
  },
} as const
