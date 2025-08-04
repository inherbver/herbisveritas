/**
 * Partner Types
 * 
 * Types for partner management system including database models,
 * form data, and display information.
 */

import type { Database } from '@/lib/supabase/types';

// Database types
export type Partner = Database['public']['Tables']['partners']['Row'];
export type PartnerInsert = Database['public']['Tables']['partners']['Insert'];
export type PartnerUpdate = Database['public']['Tables']['partners']['Update'];

// Form types for creating/updating partners
export interface CreatePartnerData {
  name: string;
  description: string;
  address: string;
  image_url: string;
  facebook_url?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface UpdatePartnerData extends Partial<CreatePartnerData> {
  id: string;
}

// Display types for public listings
export interface PartnerInfo {
  id: string;
  name: string;
  description: string;
  address: string;
  imageUrl: string;
  facebookUrl?: string;
  displayOrder: number;
  isActive: boolean;
}

// Legacy compatibility for existing components
export type PartnerData = PartnerInfo;

// Utility types
export interface PartnerFormData {
  name: string;
  description: string;
  address: string;
  image_url: string;
  facebook_url: string;
  display_order: string; // String because form inputs are strings
  is_active: boolean;
}

// Sort and filter options
export type PartnerSortBy = 'display_order' | 'name' | 'created_at';
export type PartnerSortDirection = 'asc' | 'desc';

export interface PartnerFilters {
  isActive?: boolean;
  searchQuery?: string;
}

export interface PartnerSortOptions {
  sortBy: PartnerSortBy;
  direction: PartnerSortDirection;
}