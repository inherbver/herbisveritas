// Types Supabase générés automatiquement - NE PAS MODIFIER MANUELLEMENT
// Généré le: 2025-01-08

import { TipTapContent } from "./magazine";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          address_type: string
          city: string
          company_name: string | null
          country_code: string
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          is_default: boolean
          last_name: string | null
          phone_number: string | null
          postal_code: string
          state_province_region: string | null
          street_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          address_type: string
          city: string
          company_name?: string | null
          country_code: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_default?: boolean
          last_name?: string | null
          phone_number?: string | null
          postal_code: string
          state_province_region?: string | null
          street_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          address_type?: string
          city?: string
          company_name?: string | null
          country_code?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_default?: boolean
          last_name?: string | null
          phone_number?: string | null
          postal_code?: string
          state_province_region?: string | null
          street_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      article_tags: {
        Row: {
          article_id: string
          tag_id: string
        }
        Insert: {
          article_id: string
          tag_id: string
        }
        Update: {
          article_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string
          category_id: string | null
          content: Json
          content_html: string | null
          created_at: string | null
          excerpt: string | null
          featured_image: string | null
          id: string
          published_at: string | null
          reading_time: number | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: string | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: Json
          content_html?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: string | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: Json
          content_html?: string | null
          created_at?: string | null
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          published_at?: string | null
          reading_time?: number | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          created_at: string
          data: Json | null
          event_type: string
          id: string
          severity: Database["public"]["Enums"]["event_severity"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          event_type: string
          id?: string
          severity?: Database["public"]["Enums"]["event_severity"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          event_type?: string
          id?: string
          severity?: Database["public"]["Enums"]["event_severity"]
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          added_at?: string
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          updated_at?: string
        }
        Update: {
          added_at?: string
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cart_product_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          guest_id: string | null
          id: string
          metadata: Json | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_id?: string | null
          id?: string
          metadata?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      featured_hero_items: {
        Row: {
          created_at: string
          custom_subtitle: string
          id: string
          image_hero_url: string | null
          is_active: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_subtitle: string
          id?: string
          image_hero_url?: string | null
          is_active?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_subtitle?: string
          id?: string
          image_hero_url?: string | null
          is_active?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_hero_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cart_product_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "featured_hero_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content: string | null
          created_at: string | null
          id: number
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: number
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: number
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          id: string
          ip_address: string
          key: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
          key: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
          key?: string
        }
        Relationships: []
      }
      markets: {
        Row: {
          address: string
          city: string
          created_at: string | null
          day_of_week: number
          description: string | null
          end_date: string
          end_time: string
          gps_link: string | null
          hero_image_url: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          start_date: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          address: string
          city: string
          created_at?: string | null
          day_of_week: number
          description?: string | null
          end_date: string
          end_time: string
          gps_link?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          start_date: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          city?: string
          created_at?: string | null
          day_of_week?: number
          description?: string | null
          end_date?: string
          end_time?: string
          gps_link?: string | null
          hero_image_url?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          start_date?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_at_purchase: number
          product_id: string
          product_image_url_at_purchase: string | null
          product_name_at_purchase: string | null
          product_sku_at_purchase: string | null
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_at_purchase: number
          product_id: string
          product_image_url_at_purchase?: string | null
          product_name_at_purchase?: string | null
          product_sku_at_purchase?: string | null
          quantity: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_at_purchase?: number
          product_id?: string
          product_image_url_at_purchase?: string | null
          product_name_at_purchase?: string | null
          product_sku_at_purchase?: string | null
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cart_product_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          billing_address_id: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          order_number: string | null
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status_type"]
          pickup_point_id: string | null
          shipping_address_id: string | null
          shipping_fee: number | null
          status: Database["public"]["Enums"]["order_status_type"]
          stripe_checkout_id: string | null
          stripe_checkout_session_id: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_address_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          pickup_point_id?: string | null
          shipping_address_id?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status_type"]
          stripe_checkout_id?: string | null
          stripe_checkout_session_id?: string | null
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_address_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          order_number?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status_type"]
          pickup_point_id?: string | null
          shipping_address_id?: string | null
          shipping_fee?: number | null
          status?: Database["public"]["Enums"]["order_status_type"]
          stripe_checkout_id?: string | null
          stripe_checkout_session_id?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_billing_address_id_fkey"
            columns: ["billing_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_point_id_fkey"
            columns: ["pickup_point_id"]
            isOneToOne: false
            referencedRelation: "pickup_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipping_address_id_fkey"
            columns: ["shipping_address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          address: string
          created_at: string | null
          description: string
          display_order: number | null
          facebook_url: string | null
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address: string
          created_at?: string | null
          description: string
          display_order?: number | null
          facebook_url?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          created_at?: string | null
          description?: string
          display_order?: number | null
          facebook_url?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pickup_points: {
        Row: {
          address: string
          city: string
          created_at: string | null
          distance: number | null
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          order_id: string | null
          point_id: string
          zip_code: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string | null
          distance?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          order_id?: string | null
          point_id: string
          zip_code: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string | null
          distance?: number | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          order_id?: string | null
          point_id?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_points_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          composition_text: string | null
          created_at: string
          description_long: string | null
          id: string
          locale: string
          name: string
          product_id: string
          properties: string | null
          short_description: string | null
          updated_at: string
          usage_instructions: string | null
        }
        Insert: {
          composition_text?: string | null
          created_at?: string
          description_long?: string | null
          id?: string
          locale: string
          name: string
          product_id: string
          properties?: string | null
          short_description?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Update: {
          composition_text?: string | null
          created_at?: string
          description_long?: string | null
          id?: string
          locale?: string
          name?: string
          product_id?: string
          properties?: string | null
          short_description?: string | null
          updated_at?: string
          usage_instructions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "cart_product_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          currency: string
          description_long: string | null
          description_short: string | null
          id: string
          image_url: string | null
          inci_list: string[] | null
          is_active: boolean
          is_new: boolean
          is_on_promotion: boolean
          labels: string[] | null
          name: string
          price: number
          slug: string
          status: string | null
          stock: number
          unit: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          currency?: string
          description_long?: string | null
          description_short?: string | null
          id: string
          image_url?: string | null
          inci_list?: string[] | null
          is_active?: boolean
          is_new?: boolean
          is_on_promotion?: boolean
          labels?: string[] | null
          name: string
          price: number
          slug: string
          status?: string | null
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          currency?: string
          description_long?: string | null
          description_short?: string | null
          id?: string
          image_url?: string | null
          inci_list?: string[] | null
          is_active?: boolean
          is_new?: boolean
          is_on_promotion?: boolean
          labels?: string[] | null
          name?: string
          price?: number
          slug?: string
          status?: string | null
          stock?: number
          unit?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          billing_address_is_different: boolean | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_country_code: string | null
          billing_phone_number: string | null
          billing_postal_code: string | null
          billing_state_province_region: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          newsletter_subscribed: boolean | null
          phone_number: string | null
          role: Database["public"]["Enums"]["app_role"]
          salutation: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          terms_accepted_at: string | null
          updated_at: string | null
          use_shipping_for_billing: boolean | null
        }
        Insert: {
          billing_address_is_different?: boolean | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_country_code?: string | null
          billing_phone_number?: string | null
          billing_postal_code?: string | null
          billing_state_province_region?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          newsletter_subscribed?: boolean | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          salutation?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          use_shipping_for_billing?: boolean | null
        }
        Update: {
          billing_address_is_different?: boolean | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_country_code?: string | null
          billing_phone_number?: string | null
          billing_postal_code?: string | null
          billing_state_province_region?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          newsletter_subscribed?: boolean | null
          phone_number?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          salutation?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          terms_accepted_at?: string | null
          updated_at?: string | null
          use_shipping_for_billing?: boolean | null
        }
        Relationships: []
      }
      shipping_methods: {
        Row: {
          carrier: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          description?: string | null
          id: string
          is_active?: boolean
          name: string
          price: number
        }
        Update: {
          carrier?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      cart_product_details: {
        Row: {
          created_at: string | null
          description_long: string | null
          description_short: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          price: number | null
          product_translations: Json | null
          slug: string | null
          stock: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      cleanup_monitoring: {
        Row: {
          created_at: string | null
          event_type: string | null
          full_details: Json | null
          operation_type: Json | null
          severity: Database["public"]["Enums"]["event_severity"] | null
          threshold_days: number | null
          users_deleted: number | null
          users_preserved: number | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          full_details?: Json | null
          operation_type?: never
          severity?: Database["public"]["Enums"]["event_severity"] | null
          threshold_days?: never
          users_deleted?: never
          users_preserved?: never
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          full_details?: Json | null
          operation_type?: never
          severity?: Database["public"]["Enums"]["event_severity"] | null
          threshold_days?: never
          users_deleted?: never
          users_preserved?: never
        }
        Relationships: []
      }
    }
    Functions: {
      add_or_update_cart_item: {
        Args: {
          p_cart_id: string
          p_product_id?: string
          p_quantity_to_add?: number
        }
        Returns: {
          added_at: string
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }[]
      }
      check_email_exists: {
        Args: { email_to_check: string }
        Returns: boolean
      }
      cleanup_old_anonymous_users: {
        Args: { days_threshold?: number; dry_run?: boolean }
        Returns: {
          action_type: string
          user_count: number
          details: Json
        }[]
      }
      create_missing_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          email: string
          action_taken: string
        }[]
      }
      create_product_with_translations: {
        Args: { product_data: Json; translations_data: Json }
        Returns: string
      }
      create_product_with_translations_v2: {
        Args: { product_data: Json; translations_data: Json }
        Returns: Json
      }
      current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      get_cleanup_report: {
        Args: { days_back?: number }
        Returns: {
          report_date: string
          anonymous_users_count: number
          users_growth_rate: number
          last_cleanup_date: string
          users_cleaned_last_month: number
          recommendation: string
        }[]
      }
      get_cleanup_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          stat_name: string
          stat_value: number
          description: string
        }[]
      }
      get_guest_id_from_jwt: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_my_custom_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_current_user_a_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_current_user_dev: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_service_context: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      log_auth_event: {
        Args: {
          p_event_type: string
          p_user_id: string
          p_email?: string
          p_metadata?: Json
        }
        Returns: string
      }
      log_event: {
        Args: {
          p_event_type: string
          p_user_id?: string
          p_data?: Json
          p_severity?: Database["public"]["Enums"]["event_severity"]
        }
        Returns: string
      }
      merge_carts: {
        Args: { p_guest_cart_id: string; p_auth_cart_id: string }
        Returns: undefined
      }
      merge_guest_cart_to_user: {
        Args: { p_user_id: string; p_guest_id: string }
        Returns: string
      }
      monitor_missing_profiles: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      run_weekly_anonymous_cleanup: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      safe_cast_to_jsonb: {
        Args: { p_text: string }
        Returns: Json
      }
      update_product_with_translations: {
        Args: {
          p_id: string
          p_slug: string
          p_price: number
          p_stock: number
          p_unit: string
          p_image_url: string
          p_inci_list: string[]
          p_status: string
          p_is_active: boolean
          p_is_new: boolean
          p_is_on_promotion: boolean
          p_translations: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "editor" | "admin" | "dev"
      event_severity: "INFO" | "WARNING" | "ERROR" | "CRITICAL"
      order_status_type:
        | "pending_payment"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status_type: "pending" | "succeeded" | "failed" | "refunded"
    }
    CompositeTypes: {
      cart_operation_result: {
        success: boolean | null
        message: string | null
        cart_id: string | null
        total_items: number | null
      }
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
      app_role: ["user", "editor", "admin", "dev"],
      event_severity: ["INFO", "WARNING", "ERROR", "CRITICAL"],
      order_status_type: [
        "pending_payment",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status_type: ["pending", "succeeded", "failed", "refunded"],
    },
  },
} as const