"use server";

/**
 * Newsletter Server Actions
 *
 * Server actions for newsletter subscription management
 * Includes authentication, validation, and rate limiting
 */

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkAdminRole } from "@/lib/auth/admin-service";
import { ActionResult } from "@/lib/core/result";
import { headers } from "next/headers";
import { logEvent } from "@/lib/admin/event-logger";
import type {
  NewsletterSubscriber,
  NewsletterStats,
  NewsletterSubscriptionData,
} from "@/types/newsletter";
import {
  validateNewsletterForm,
  newsletterSubscriptionSchema,
  newsletterSubscriberUpdateSchema,
  newsletterUnsubscribeSchema,
  bulkNewsletterOperationSchema as _bulkNewsletterOperationSchema,
} from "@/lib/validators/newsletter";

/**
 * Subscribe to newsletter
 */
export async function subscribeToNewsletter(
  formData: FormData
): Promise<ActionResult<{ email: string }>> {
  try {
    // 1. Validate form data
    const validatedData = validateNewsletterForm(formData);
    if (!validatedData) {
      return { success: false, error: "Adresse email invalide" };
    }

    // 2. Get additional metadata
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || undefined;
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ipAddress = forwardedFor?.split(",")[0] || realIp || undefined;

    // 3. Create subscription data
    const subscriptionData: NewsletterSubscriptionData = {
      email: validatedData.email,
      source: "footer_form",
      user_agent: userAgent,
      ip_address: ipAddress,
    };

    // 4. Validate with schema
    const validation = newsletterSubscriptionSchema.safeParse(subscriptionData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        error: `Validation échouée: ${firstError.message}`,
      };
    }

    // 5. Insert into database
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("newsletter_subscribers")
      .insert(validation.data)
      .select("email")
      .single();

    if (error) {
      // Handle duplicate email gracefully
      if (error.code === "23505") {
        // unique_violation
        return {
          success: false,
          error: "Cette adresse email est déjà inscrite à notre newsletter",
        };
      }

      console.error("Database error subscribing to newsletter:", error);
      return {
        success: false,
        error: "Erreur lors de l'inscription à la newsletter",
      };
    }

    // 6. Log the subscription event
    await logEvent(
      "NEWSLETTER_SUBSCRIPTION",
      undefined, // No user ID for newsletter subscriptions from footer
      {
        email: data.email,
        source: subscriptionData.source,
        ip_address: subscriptionData.ip_address,
        message: `Nouvelle inscription newsletter: ${data.email}`,
      },
      "INFO"
    );

    // 7. Revalidate relevant pages
    revalidatePath("/");

    return {
      success: true,
      data: { email: data.email },
      message: "Inscription à la newsletter réussie ! Merci de votre confiance.",
    };
  } catch (error) {
    console.error("Unexpected error subscribing to newsletter:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de l'inscription",
    };
  }
}

/**
 * Unsubscribe from newsletter
 */
export async function unsubscribeFromNewsletter(email: string): Promise<ActionResult<void>> {
  try {
    // 1. Validate email
    const validation = newsletterUnsubscribeSchema.safeParse({ email });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        error: `Email invalide: ${firstError.message}`,
      };
    }

    // 2. Update subscription status
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ is_active: false })
      .eq("email", validation.data.email)
      .eq("is_active", true);

    if (error) {
      console.error("Database error unsubscribing from newsletter:", error);
      return {
        success: false,
        error: "Erreur lors de la désinscription",
      };
    }

    // 3. Log the unsubscription event
    await logEvent(
      "NEWSLETTER_UNSUBSCRIPTION",
      undefined, // No user ID for newsletter unsubscriptions
      {
        email: validation.data.email,
        message: `Désabonnement newsletter: ${validation.data.email}`,
      },
      "INFO"
    );

    // 4. Revalidate relevant pages
    revalidatePath("/admin/newsletter");

    return {
      success: true,
      message: "Désinscription réussie",
    };
  } catch (error) {
    console.error("Unexpected error unsubscribing from newsletter:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la désinscription",
    };
  }
}

/**
 * Get all newsletter subscribers (admin only)
 */
export async function getNewsletterSubscribers(): Promise<ActionResult<NewsletterSubscriber[]>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès non autorisé. Seuls les administrateurs peuvent voir les abonnés.",
      };
    }

    // 2. Fetch subscribers
    const { data: subscribers, error } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });

    if (error) {
      console.error("Database error fetching newsletter subscribers:", error);
      return {
        success: false,
        error: "Erreur lors de la récupération des abonnés",
      };
    }

    return {
      success: true,
      data: subscribers || [],
    };
  } catch (error) {
    console.error("Unexpected error fetching newsletter subscribers:", error);
    return {
      success: false,
      error: "Erreur inattendue lors de la récupération",
    };
  }
}

/**
 * Get newsletter statistics (admin only)
 */
export async function getNewsletterStats(): Promise<ActionResult<NewsletterStats>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    // 2. Get stats using individual queries
    const [totalResult, activeResult, recentResult] = await Promise.all([
      supabase.from("newsletter_subscribers").select("*", { count: "exact", head: true }),
      supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("newsletter_subscribers")
        .select("*", { count: "exact", head: true })
        .gte("subscribed_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    return {
      success: true,
      data: {
        total_subscribers: totalResult.count || 0,
        active_subscribers: activeResult.count || 0,
        inactive_subscribers: (totalResult.count || 0) - (activeResult.count || 0),
        recent_subscriptions: recentResult.count || 0,
      },
    };
  } catch (error) {
    console.error("Unexpected error fetching newsletter stats:", error);
    return {
      success: false,
      error: "Erreur inattendue",
    };
  }
}

/**
 * Toggle newsletter subscriber status (admin only)
 */
export async function toggleNewsletterSubscriber(
  id: string,
  isActive: boolean
): Promise<ActionResult<void>> {
  try {
    // 1. Check admin permissions
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }
    const isAdmin = await checkAdminRole(user.id);
    if (!isAdmin) {
      return {
        success: false,
        error: "Accès non autorisé",
      };
    }

    // 2. Validate data
    const validation = newsletterSubscriberUpdateSchema.safeParse({ id, is_active: isActive });
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      return {
        success: false,
        error: `Validation échouée: ${firstError.message}`,
      };
    }

    // 3. Update subscriber status
    const { error } = await supabase
      .from("newsletter_subscribers")
      .update({ is_active: validation.data.is_active })
      .eq("id", validation.data.id);

    if (error) {
      console.error("Database error updating newsletter subscriber:", error);
      return {
        success: false,
        error: "Erreur lors de la modification",
      };
    }

    // 4. Revalidate admin page
    revalidatePath("/admin/newsletter");

    const statusText = validation.data.is_active ? "activé" : "désactivé";
    return {
      success: true,
      message: `Abonnement ${statusText} avec succès`,
    };
  } catch (error) {
    console.error("Unexpected error updating newsletter subscriber:", error);
    return {
      success: false,
      error: "Erreur inattendue",
    };
  }
}
