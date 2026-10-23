export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string;
          currency: string;
          customer_id: string;
          ends_at: string;
          id: string;
          price_minor: number;
          request_id: string | null;
          service_id: string;
          service_name: string;
          staff_id: string;
          starts_at: string;
          status: string;
          venue_id: string;
        };
        Insert: {
          created_at?: string;
          currency?: string;
          customer_id: string;
          ends_at: string;
          id?: string;
          price_minor: number;
          request_id?: string | null;
          service_id: string;
          service_name: string;
          staff_id: string;
          starts_at: string;
          status?: string;
          venue_id: string;
        };
        Update: {
          created_at?: string;
          currency?: string;
          customer_id?: string;
          ends_at?: string;
          id?: string;
          price_minor?: number;
          request_id?: string | null;
          service_id?: string;
          service_name?: string;
          staff_id?: string;
          starts_at?: string;
          status?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_venue_id_fkey";
            columns: ["service_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "venue_id"];
          },
          {
            foreignKeyName: "appointments_staff_id_venue_id_fkey";
            columns: ["staff_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id", "venue_id"];
          },
          {
            foreignKeyName: "appointments_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      availability: {
        Row: {
          ends_at: string;
          id: string;
          staff_id: string;
          starts_at: string;
          venue_id: string;
        };
        Insert: {
          ends_at: string;
          id?: string;
          staff_id: string;
          starts_at: string;
          venue_id: string;
        };
        Update: {
          ends_at?: string;
          id?: string;
          staff_id?: string;
          starts_at?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_staff_id_venue_id_fkey";
            columns: ["staff_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id", "venue_id"];
          },
        ];
      };
      businesses: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string;
          provider_type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id: string;
          provider_type?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string;
          provider_type?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
        };
        Relationships: [];
      };
      provider_application_reviews: {
        Row: {
          decision: string;
          id: string;
          reason: string;
          reviewed_at: string;
          revision: number;
          user_id: string;
        };
        Insert: {
          decision: string;
          id?: string;
          reason: string;
          reviewed_at?: string;
          revision: number;
          user_id: string;
        };
        Update: {
          decision?: string;
          id?: string;
          reason?: string;
          reviewed_at?: string;
          revision?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_application_reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "provider_applications";
            referencedColumns: ["user_id"];
          },
        ];
      };
      provider_applications: {
        Row: {
          address_or_area: string;
          approved_business_id: string | null;
          city: string;
          contact_address: string | null;
          contact_name: string;
          country_code: string | null;
          declaration_at: string | null;
          declaration_version: string | null;
          description: string;
          experience_years: number;
          legal_name: string | null;
          operating_status: string | null;
          phone: string;
          portfolio_url: string;
          provider_type: string;
          public_name: string;
          qualification_summary: string;
          registration_number: string;
          review_reason: string;
          reviewed_at: string | null;
          revision: number;
          service_categories: string[];
          status: string;
          submitted_at: string;
          user_id: string;
          work_mode: string;
        };
        Insert: {
          address_or_area: string;
          approved_business_id?: string | null;
          city: string;
          contact_address?: string | null;
          contact_name: string;
          country_code?: string | null;
          declaration_at?: string | null;
          declaration_version?: string | null;
          description: string;
          experience_years: number;
          legal_name?: string | null;
          operating_status?: string | null;
          phone: string;
          portfolio_url?: string;
          provider_type: string;
          public_name: string;
          qualification_summary?: string;
          registration_number?: string;
          review_reason?: string;
          reviewed_at?: string | null;
          revision?: number;
          service_categories: string[];
          status?: string;
          submitted_at?: string;
          user_id: string;
          work_mode: string;
        };
        Update: {
          address_or_area?: string;
          approved_business_id?: string | null;
          city?: string;
          contact_address?: string | null;
          contact_name?: string;
          country_code?: string | null;
          declaration_at?: string | null;
          declaration_version?: string | null;
          description?: string;
          experience_years?: number;
          legal_name?: string | null;
          operating_status?: string | null;
          phone?: string;
          portfolio_url?: string;
          provider_type?: string;
          public_name?: string;
          qualification_summary?: string;
          registration_number?: string;
          review_reason?: string;
          reviewed_at?: string | null;
          revision?: number;
          service_categories?: string[];
          status?: string;
          submitted_at?: string;
          user_id?: string;
          work_mode?: string;
        };
        Relationships: [
          {
            foreignKeyName: "provider_applications_approved_business_id_fkey";
            columns: ["approved_business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      services: {
        Row: {
          active: boolean;
          currency: string;
          duration_minutes: number;
          id: string;
          name: string;
          price_minor: number;
          venue_id: string;
        };
        Insert: {
          active?: boolean;
          currency?: string;
          duration_minutes: number;
          id?: string;
          name: string;
          price_minor: number;
          venue_id: string;
        };
        Update: {
          active?: boolean;
          currency?: string;
          duration_minutes?: number;
          id?: string;
          name?: string;
          price_minor?: number;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "services_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      staff: {
        Row: {
          active: boolean;
          display_name: string;
          id: string;
          venue_id: string;
        };
        Insert: {
          active?: boolean;
          display_name: string;
          id?: string;
          venue_id: string;
        };
        Update: {
          active?: boolean;
          display_name?: string;
          id?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_services: {
        Row: {
          service_id: string;
          staff_id: string;
          venue_id: string;
        };
        Insert: {
          service_id: string;
          staff_id: string;
          venue_id: string;
        };
        Update: {
          service_id?: string;
          staff_id?: string;
          venue_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "staff_services_service_id_venue_id_fkey";
            columns: ["service_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id", "venue_id"];
          },
          {
            foreignKeyName: "staff_services_staff_id_venue_id_fkey";
            columns: ["staff_id", "venue_id"];
            isOneToOne: false;
            referencedRelation: "staff";
            referencedColumns: ["id", "venue_id"];
          },
          {
            foreignKeyName: "staff_services_venue_id_fkey";
            columns: ["venue_id"];
            isOneToOne: false;
            referencedRelation: "venues";
            referencedColumns: ["id"];
          },
        ];
      };
      venues: {
        Row: {
          business_id: string;
          category: string;
          city: string;
          created_at: string;
          description: string;
          id: string;
          is_demo: boolean;
          name: string;
          neighborhood: string;
          published: boolean;
          slug: string;
          timezone: string;
        };
        Insert: {
          business_id: string;
          category: string;
          city: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_demo?: boolean;
          name: string;
          neighborhood?: string;
          published?: boolean;
          slug: string;
          timezone?: string;
        };
        Update: {
          business_id?: string;
          category?: string;
          city?: string;
          created_at?: string;
          description?: string;
          id?: string;
          is_demo?: boolean;
          name?: string;
          neighborhood?: string;
          published?: boolean;
          slug?: string;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "venues_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      book_appointment: {
        Args: {
          p_expected_duration: number;
          p_expected_price: number;
          p_request_id: string;
          p_service_id: string;
          p_staff_id: string;
          p_starts_at: string;
        };
        Returns: string;
      };
      cancel_appointment: {
        Args: { p_appointment_id: string };
        Returns: undefined;
      };
      list_booking_slots: {
        Args: { p_day: string; p_service_id: string };
        Returns: {
          ends_at: string;
          staff_id: string;
          staff_name: string;
          starts_at: string;
        }[];
      };
      remove_availability: { Args: { p_id: string }; Returns: undefined };
      submit_provider_application: {
        Args: { p_details: Json };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

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
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
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
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
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
  public: {
    Enums: {},
  },
} as const;
