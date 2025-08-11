/**
 * Newsletter Validation Schemas
 *
 * Zod schemas for newsletter subscription validation
 */

import { z } from "zod";

// Email validation schema
export const emailSchema = z
  .string()
  .min(1, "L'adresse email est requise")
  .email("Format d'adresse email invalide")
  .max(255, "L'adresse email est trop longue")
  .toLowerCase()
  .trim();

// Newsletter subscription schema
export const newsletterSubscriptionSchema = z.object({
  email: emailSchema,
  source: z.string().optional().default("footer_form"),
  user_agent: z.string().optional(),
  ip_address: z.string().optional(),
});

// Newsletter form schema (client-side)
export const newsletterFormSchema = z.object({
  email: emailSchema,
});

// Newsletter subscriber update schema (admin)
export const newsletterSubscriberUpdateSchema = z.object({
  id: z.string().uuid("ID invalide"),
  is_active: z.boolean(),
});

// Newsletter unsubscribe schema
export const newsletterUnsubscribeSchema = z.object({
  email: emailSchema,
});

// Bulk newsletter operations schema (admin)
export const bulkNewsletterOperationSchema = z.object({
  subscriber_ids: z.array(z.string().uuid()).min(1, "Au moins un abonné doit être sélectionné"),
  action: z.enum(["activate", "deactivate", "delete"]),
});

// Validation helper functions
export function validateNewsletterEmail(email: string) {
  return emailSchema.safeParse(email);
}

export function validateNewsletterSubscription(data: unknown) {
  return newsletterSubscriptionSchema.safeParse(data);
}

export function validateNewsletterForm(formData: FormData): { email: string } | null {
  try {
    const email = formData.get("email");

    if (!email || typeof email !== "string") {
      return null;
    }

    const validation = newsletterFormSchema.safeParse({ email });

    if (!validation.success) {
      return null;
    }

    return validation.data;
  } catch {
    return null;
  }
}

// Export types inferred from schemas
export type NewsletterSubscriptionInput = z.infer<typeof newsletterSubscriptionSchema>;
export type NewsletterFormInput = z.infer<typeof newsletterFormSchema>;
export type NewsletterSubscriberUpdateInput = z.infer<typeof newsletterSubscriberUpdateSchema>;
export type NewsletterUnsubscribeInput = z.infer<typeof newsletterUnsubscribeSchema>;
export type BulkNewsletterOperationInput = z.infer<typeof bulkNewsletterOperationSchema>;
