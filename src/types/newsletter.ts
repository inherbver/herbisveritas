/**
 * Newsletter Types
 *
 * TypeScript interfaces for newsletter subscription management
 */

export interface NewsletterSubscriber {
  id: string;
  email: string;
  subscribed_at: string;
  is_active: boolean;
  source?: string | null;
  user_agent?: string | null;
  ip_address?: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriptionData {
  email: string;
  source?: string;
  user_agent?: string;
  ip_address?: string;
}

export interface NewsletterSubscriptionRequest {
  email: string;
}

export interface NewsletterStats {
  total_subscribers: number;
  active_subscribers: number;
  inactive_subscribers: number;
  recent_subscriptions: number; // Last 30 days
}

// Form data type for newsletter subscription
export type NewsletterFormData = {
  email: string;
};

// Database insert type (excluding auto-generated fields)
export type NewsletterSubscriberInsert = Omit<
  NewsletterSubscriber,
  "id" | "subscribed_at" | "created_at" | "updated_at"
>;

// Database update type (only updatable fields)
export type NewsletterSubscriberUpdate = {
  is_active?: boolean;
  updated_at?: string;
};
