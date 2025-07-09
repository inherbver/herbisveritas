export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          operationName?: string;
          query?: string;
          variables?: Json;
          extensions?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string;
          address_line2: string | null;
          address_type: Database["public"]["Enums"]["address_type"];
          city: string;
          company_name: string | null;
          country_code: string;
          created_at: string;
          email: string | null;
          first_name: string;
          id: string;
          last_name: string;
          phone_number: string | null;
          postal_code: string;
          state_province_region: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          address_line1: string;
          address_line2?: string | null;
          address_type: Database["public"]["Enums"]["address_type"];
          city: string;
          company_name?: string | null;
          country_code: string;
          created_at?: string;
          email?: string | null;
          first_name: string;
          id?: string;
          last_name: string;
          phone_number?: string | null;
          postal_code: string;
          state_province_region?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          address_line1?: string;
          address_line2?: string | null;
          address_type?: Database["public"]["Enums"]["address_type"];
          city?: string;
          company_name?: string | null;
          country_code?: string;
          created_at?: string;
          email?: string | null;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone_number?: string | null;
          postal_code?: string;
          state_province_region?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "addresses_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          created_at: string;
          data: Json | null;
          event_type: string;
          id: number;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          data?: Json | null;
          event_type: string;
          id?: number;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          data?: Json | null;
          event_type?: string;
          id?: number;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      cart_items: {
        Row: {
          added_at: string;
          cart_id: string;
          created_at: string;
          id: string;
          price: number | null;
          product_id: string;
          quantity: number;
        };
        Insert: {
          added_at?: string;
          cart_id: string;
          created_at?: string;
          id?: string;
          price?: number | null;
          product_id: string;
          quantity: number;
        };
        Update: {
          added_at?: string;
          cart_id?: string;
          created_at?: string;
          id?: string;
          price?: number | null;
          product_id?: string;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string;
          id: string;
          status: string;
          total_amount: number | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          status?: string;
          total_amount?: number | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          status?: string;
          total_amount?: number | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          description: string | null;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      featured_hero_items: {
        Row: {
          created_at: string;
          id: string;
          is_active: boolean;
          product_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          product_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_active?: boolean;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "featured_hero_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          price: number;
          price_at_purchase: number;
          product_id: string;
          product_snapshot: Json | null;
          quantity: number;
        };
        Insert: {
          id?: string;
          order_id: string;
          price: number;
          price_at_purchase: number;
          product_id: string;
          product_snapshot?: Json | null;
          quantity: number;
        };
        Update: {
          id?: string;
          order_id?: string;
          price?: number;
          price_at_purchase?: number;
          product_id?: string;
          product_snapshot?: Json | null;
          quantity?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          billing_address_id: string | null;
          created_at: string;
          id: string;
          shipping_address_id: string | null;
          status: string;
          stripe_checkout_id: string | null;
          total_amount: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          billing_address_id?: string | null;
          created_at?: string;
          id?: string;
          shipping_address_id?: string | null;
          status?: string;
          stripe_checkout_id?: string | null;
          total_amount: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_address_id?: string | null;
          created_at?: string;
          id?: string;
          shipping_address_id?: string | null;
          status?: string;
          stripe_checkout_id?: string | null;
          total_amount?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      product_categories: {
        Row: {
          category_id: string;
          product_id: string;
        };
        Insert: {
          category_id: string;
          product_id: string;
        };
        Update: {
          category_id?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_categories_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      product_translations: {
        Row: {
          description: string | null;
          id: string;
          language_code: string;
          name: string;
          product_id: string;
        };
        Insert: {
          description?: string | null;
          id?: string;
          language_code: string;
          name: string;
          product_id: string;
        };
        Update: {
          description?: string | null;
          id?: string;
          language_code?: string;
          name?: string;
          product_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          image_urls: string[] | null;
          is_featured: boolean | null;
          name: string;
          price: number;
          slug: string;
          status: string | null;
          stock_quantity: number;
          stripe_product_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_urls?: string[] | null;
          is_featured?: boolean | null;
          name: string;
          price: number;
          slug: string;
          status?: string | null;
          stock_quantity?: number;
          stripe_product_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          image_urls?: string[] | null;
          is_featured?: boolean | null;
          name?: string;
          price?: number;
          slug?: string;
          status?: string | null;
          stock_quantity?: number;
          stripe_product_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          billing_address_is_different: boolean | null;
          created_at: string;
          first_name: string | null;
          id: string;
          last_name: string | null;
          newsletter_subscribed: boolean | null;
          phone_number: string | null;
          role: Database["public"]["Enums"]["app_role"];
          updated_at: string;
          use_shipping_for_billing: boolean | null;
        };
        Insert: {
          billing_address_is_different?: boolean | null;
          created_at?: string;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
          newsletter_subscribed?: boolean | null;
          phone_number?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          use_shipping_for_billing?: boolean | null;
        };
        Update: {
          billing_address_is_different?: boolean | null;
          created_at?: string;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
          newsletter_subscribed?: boolean | null;
          phone_number?: string | null;
          role?: Database["public"]["Enums"]["app_role"];
          updated_at?: string;
          use_shipping_for_billing?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      users: {
        Row: {
          aud: string | null;
          banned_until: string | null;
          confirmation_sent_at: string | null;
          confirmation_token: string | null;
          confirmed_at: string | null;
          created_at: string | null;
          deleted_at: string | null;
          email: string | null;
          email_change: string | null;
          email_change_confirm_status: number | null;
          email_change_sent_at: string | null;
          email_change_token_current: string | null;
          email_change_token_new: string | null;
          email_confirmed_at: string | null;
          encrypted_password: string | null;
          id: string | null;
          instance_id: string | null;
          invited_at: string | null;
          is_anonymous: boolean | null;
          is_sso_user: boolean | null;
          is_super_admin: boolean | null;
          last_sign_in_at: string | null;
          phone: string | null;
          phone_change: string | null;
          phone_change_sent_at: string | null;
          phone_change_token: string | null;
          phone_confirmed_at: string | null;
          raw_app_meta_data: Json | null;
          raw_user_meta_data: Json | null;
          reauthentication_sent_at: string | null;
          reauthentication_token: string | null;
          recovery_sent_at: string | null;
          recovery_token: string | null;
          role: string | null;
          updated_at: string | null;
        };
        Insert: {
          aud?: string | null;
          banned_until?: string | null;
          confirmation_sent_at?: string | null;
          confirmation_token?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          email_change?: string | null;
          email_change_confirm_status?: number | null;
          email_change_sent_at?: string | null;
          email_change_token_current?: string | null;
          email_change_token_new?: string | null;
          email_confirmed_at?: string | null;
          encrypted_password?: string | null;
          id?: string | null;
          instance_id?: string | null;
          invited_at?: string | null;
          is_anonymous?: boolean | null;
          is_sso_user?: boolean | null;
          is_super_admin?: boolean | null;
          last_sign_in_at?: string | null;
          phone?: string | null;
          phone_change?: string | null;
          phone_change_sent_at?: string | null;
          phone_change_token?: string | null;
          phone_confirmed_at?: string | null;
          raw_app_meta_data?: Json | null;
          raw_user_meta_data?: Json | null;
          reauthentication_sent_at?: string | null;
          reauthentication_token?: string | null;
          recovery_sent_at?: string | null;
          recovery_token?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Update: {
          aud?: string | null;
          banned_until?: string | null;
          confirmation_sent_at?: string | null;
          confirmation_token?: string | null;
          confirmed_at?: string | null;
          created_at?: string | null;
          deleted_at?: string | null;
          email?: string | null;
          email_change?: string | null;
          email_change_confirm_status?: number | null;
          email_change_sent_at?: string | null;
          email_change_token_current?: string | null;
          email_change_token_new?: string | null;
          email_confirmed_at?: string | null;
          encrypted_password?: string | null;
          id?: string | null;
          instance_id?: string | null;
          invited_at?: string | null;
          is_anonymous?: boolean | null;
          is_sso_user?: boolean | null;
          is_super_admin?: boolean | null;
          last_sign_in_at?: string | null;
          phone?: string | null;
          phone_change?: string | null;
          phone_change_sent_at?: string | null;
          phone_change_token?: string | null;
          phone_confirmed_at?: string | null;
          raw_app_meta_data?: Json | null;
          raw_user_meta_data?: Json | null;
          reauthentication_sent_at?: string | null;
          reauthentication_token?: string | null;
          recovery_sent_at?: string | null;
          recovery_token?: string | null;
          role?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      create_order_from_cart: {
        Args: { p_cart_id: string; p_stripe_checkout_id: string };
        Returns: string;
      };
      is_current_user_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_service_context: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      address_type: "shipping" | "billing";
      app_role: "user" | "editor" | "admin" | "dev";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      address_type: ["shipping", "billing"],
      app_role: ["user", "editor", "admin", "dev"],
    },
  },
} as const;
