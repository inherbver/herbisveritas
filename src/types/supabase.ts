// Types Supabase générés
import { TipTapContent } from "./magazine";
export interface Database {
  public: {
    Tables: {
      // Table des articles
      articles: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: TipTapContent; // JSON TipTap
          content_html: string | null;
          featured_image: string | null;
          status: string | null;
          published_at: string | null;
          author_id: string;
          category_id: string | null;
          view_count: number | null;
          reading_time: number | null;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content: TipTapContent;
          content_html?: string | null;
          featured_image?: string | null;
          status?: string | null;
          published_at?: string | null;
          author_id: string;
          category_id?: string | null;
          view_count?: number | null;
          reading_time?: number | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          title?: string;
          slug?: string;
          excerpt?: string | null;
          content?: TipTapContent;
          content_html?: string | null;
          featured_image?: string | null;
          status?: string | null;
          published_at?: string | null;
          author_id?: string;
          category_id?: string | null;
          view_count?: number | null;
          reading_time?: number | null;
          seo_title?: string | null;
          seo_description?: string | null;
          updated_at?: string | null;
        };
      };
      // Table des catégories
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          color: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          color?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          color?: string | null;
          updated_at?: string | null;
        };
      };
      // Table des tags
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
        };
      };
      // Table de liaison article-tags
      article_tags: {
        Row: {
          article_id: string;
          tag_id: string;
        };
        Insert: {
          article_id: string;
          tag_id: string;
        };
        Update: {
          article_id?: string;
          tag_id?: string;
        };
      };
      // Types existants pour les produits (extraits des usages dans le code)
      products: {
        Row: {
          id: string;
          slug: string;
          name: string;
          price: number;
          description: string;
          category: string;
          is_active: boolean;
          stock: number;
          image_url: string | null;
          labels: string[];
          unit: string;
          is_new: boolean | null;
          is_on_promotion: boolean | null;
          inci_list: string[] | null;
          status: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          price: number;
          description: string;
          category: string;
          is_active?: boolean;
          stock: number;
          image_url?: string | null;
          labels?: string[];
          unit: string;
          is_new?: boolean | null;
          is_on_promotion?: boolean | null;
          inci_list?: string[] | null;
          status?: string | null;
        };
        Update: {
          slug?: string;
          name?: string;
          price?: number;
          description?: string;
          category?: string;
          is_active?: boolean;
          stock?: number;
          image_url?: string | null;
          labels?: string[];
          unit?: string;
          is_new?: boolean | null;
          is_on_promotion?: boolean | null;
          inci_list?: string[] | null;
          status?: string | null;
        };
      };
      product_translations: {
        Row: {
          id: string;
          product_id: string;
          locale: string;
          name: string;
          short_description: string | null;
          description_long: string | null;
          usage_instructions: string | null;
          properties: string | null;
          composition_text: string | null;
        };
        Insert: {
          id?: string;
          product_id: string;
          locale: string;
          name: string;
          short_description?: string | null;
          description_long?: string | null;
          usage_instructions?: string | null;
          properties?: string | null;
          composition_text?: string | null;
        };
        Update: {
          product_id?: string;
          locale?: string;
          name?: string;
          short_description?: string | null;
          description_long?: string | null;
          usage_instructions?: string | null;
          properties?: string | null;
          composition_text?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          billing_address_is_different: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          billing_address_is_different?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          billing_address_is_different?: boolean;
          updated_at?: string | null;
        };
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string | null;
          updated_at?: string | null;
        };
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          quantity: number;
          created_at?: string | null;
        };
        Update: {
          cart_id?: string;
          product_id?: string;
          quantity?: number;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          company_name: string | null;
          street_number: string | null;
          address_line1: string | null;
          address_line2: string | null;
          postal_code: string | null;
          city: string | null;
          state_province_region: string | null;
          country_code: string | null;
          phone_number: string | null;
          is_default: boolean | null;
          address_type: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          company_name?: string | null;
          street_number?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          postal_code?: string | null;
          city?: string | null;
          state_province_region?: string | null;
          country_code?: string | null;
          phone_number?: string | null;
          is_default?: boolean | null;
          address_type?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          full_name?: string | null;
          company_name?: string | null;
          street_number?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          postal_code?: string | null;
          city?: string | null;
          state_province_region?: string | null;
          country_code?: string | null;
          phone_number?: string | null;
          is_default?: boolean | null;
          address_type?: string | null;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
