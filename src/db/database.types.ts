export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      events: {
        Row: {
          created_at: string;
          destination_text: string | null;
          event_type: Database["public"]["Enums"]["event_type_enum"];
          id: string;
          plan_id: string | null;
          transport_modes: Database["public"]["Enums"]["transport_mode_enum"][] | null;
          trip_length_days: number | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          destination_text?: string | null;
          event_type: Database["public"]["Enums"]["event_type_enum"];
          id?: string;
          plan_id?: string | null;
          transport_modes?: Database["public"]["Enums"]["transport_mode_enum"][] | null;
          trip_length_days?: number | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          destination_text?: string | null;
          event_type?: Database["public"]["Enums"]["event_type_enum"];
          id?: string;
          plan_id?: string | null;
          transport_modes?: Database["public"]["Enums"]["transport_mode_enum"][] | null;
          trip_length_days?: number | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_activities: {
        Row: {
          created_at: string;
          day_id: string;
          description: string | null;
          duration_minutes: number;
          id: string;
          order_index: number;
          title: string;
          transport_minutes: number | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_id: string;
          description?: string | null;
          duration_minutes: number;
          id?: string;
          order_index: number;
          title: string;
          transport_minutes?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_id?: string;
          description?: string | null;
          duration_minutes?: number;
          id?: string;
          order_index?: number;
          title?: string;
          transport_minutes?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_activities_day_id_fkey";
            columns: ["day_id"];
            isOneToOne: false;
            referencedRelation: "plan_days";
            referencedColumns: ["id"];
          },
        ];
      };
      plan_days: {
        Row: {
          created_at: string;
          day_date: string;
          day_index: number;
          id: string;
          plan_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          day_date: string;
          day_index: number;
          id?: string;
          plan_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          day_date?: string;
          day_index?: number;
          id?: string;
          plan_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          budget: Database["public"]["Enums"]["budget_level_enum"];
          comfort: Database["public"]["Enums"]["comfort_level_enum"];
          created_at: string;
          date_end: string;
          date_start: string;
          destination_text: string;
          id: string;
          name: string;
          note_text: string;
          owner_id: string;
          people_count: number;
          transport_modes: Database["public"]["Enums"]["transport_mode_enum"][] | null;
          trip_type: Database["public"]["Enums"]["trip_type_enum"];
          updated_at: string;
        };
        Insert: {
          budget: Database["public"]["Enums"]["budget_level_enum"];
          comfort: Database["public"]["Enums"]["comfort_level_enum"];
          created_at?: string;
          date_end: string;
          date_start: string;
          destination_text: string;
          id?: string;
          name: string;
          note_text: string;
          owner_id: string;
          people_count: number;
          transport_modes?: Database["public"]["Enums"]["transport_mode_enum"][] | null;
          trip_type: Database["public"]["Enums"]["trip_type_enum"];
          updated_at?: string;
        };
        Update: {
          budget?: Database["public"]["Enums"]["budget_level_enum"];
          comfort?: Database["public"]["Enums"]["comfort_level_enum"];
          created_at?: string;
          date_end?: string;
          date_start?: string;
          destination_text?: string;
          id?: string;
          name?: string;
          note_text?: string;
          owner_id?: string;
          people_count?: number;
          transport_modes?: Database["public"]["Enums"]["transport_mode_enum"][] | null;
          trip_type?: Database["public"]["Enums"]["trip_type_enum"];
          updated_at?: string;
        };
        Relationships: [];
      };
      user_preferences: {
        Row: {
          age: number;
          budget: Database["public"]["Enums"]["budget_level_enum"];
          comfort: Database["public"]["Enums"]["comfort_level_enum"];
          country: string;
          created_at: string;
          people_count: number;
          trip_type: Database["public"]["Enums"]["trip_type_enum"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          age: number;
          budget: Database["public"]["Enums"]["budget_level_enum"];
          comfort: Database["public"]["Enums"]["comfort_level_enum"];
          country: string;
          created_at?: string;
          people_count: number;
          trip_type: Database["public"]["Enums"]["trip_type_enum"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          age?: number;
          budget?: Database["public"]["Enums"]["budget_level_enum"];
          comfort?: Database["public"]["Enums"]["comfort_level_enum"];
          country?: string;
          created_at?: string;
          people_count?: number;
          trip_type?: Database["public"]["Enums"]["trip_type_enum"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          role: Database["public"]["Enums"]["user_role_enum"];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role?: Database["public"]["Enums"]["user_role_enum"];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: Database["public"]["Enums"]["user_role_enum"];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      move_activity_transaction: {
        Args: {
          p_activity_id: string;
          p_target_day_id: string;
          p_target_order_index: number;
        };
        Returns: {
          created_at: string;
          day_id: string;
          duration_minutes: number;
          id: string;
          order_index: number;
          title: string;
          transport_minutes: number;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      budget_level_enum: "budget" | "moderate" | "luxury";
      comfort_level_enum: "relax" | "balanced" | "intense";
      event_type_enum:
        | "account_created"
        | "preferences_completed"
        | "plan_generated"
        | "plan_regenerated"
        | "plan_edited"
        | "plan_deleted";
      transport_mode_enum: "car" | "walk" | "public";
      trip_type_enum: "leisure" | "business";
      user_role_enum: "user" | "admin";
    };
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      budget_level_enum: ["budget", "moderate", "luxury"],
      comfort_level_enum: ["relax", "balanced", "intense"],
      event_type_enum: [
        "account_created",
        "preferences_completed",
        "plan_generated",
        "plan_regenerated",
        "plan_edited",
        "plan_deleted",
      ],
      transport_mode_enum: ["car", "walk", "public"],
      trip_type_enum: ["leisure", "business"],
      user_role_enum: ["user", "admin"],
    },
  },
} as const;
