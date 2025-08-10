import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventType, EventSeverity } from "./dashboard";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Service pour logger des événements dans audit_logs
 */
export class EventLogger {
  private supabase: SupabaseClient<Database>;

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase;
  }

  /**
   * Logger un événement générique
   */
  async logEvent(
    eventType: EventType,
    userId?: string,
    data?: Record<string, unknown>,
    severity: EventSeverity = "INFO"
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from("audit_logs").insert({
        event_type: eventType,
        user_id: userId || null,
        data: (data as any) || null,
        severity,
      });

      if (error) {
        console.error("Failed to log event:", error);
      }
    } catch (error) {
      console.error("Unexpected error logging event:", error);
    }
  }

  /**
   * Logger un événement d'authentification
   */
  async logAuthEvent(
    eventType: "USER_LOGIN" | "PASSWORD_RESET_REQUESTED" | "PASSWORD_RESET_COMPLETED",
    userId: string,
    email: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.logEvent(
      eventType,
      userId,
      {
        email,
        timestamp: new Date().toISOString(),
        ...metadata,
      },
      "INFO"
    );
  }

  /**
   * Logger une erreur système
   */
  async logSystemError(
    error: Error,
    context: string,
    userId?: string,
    severity: EventSeverity = "ERROR"
  ): Promise<void> {
    await this.logEvent(
      "DATABASE_ERROR",
      userId,
      {
        error_message: error.message,
        error_stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      },
      severity
    );
  }

  /**
   * Logger un événement de commande manuellement (pour les cas spéciaux)
   */
  async logOrderEvent(
    eventType: "ORDER_CREATED" | "PAYMENT_SUCCEEDED" | "PAYMENT_FAILED",
    orderId: string,
    userId: string,
    orderData: {
      order_number?: string;
      total_amount?: number;
      payment_method?: string;
      status?: string;
    }
  ): Promise<void> {
    const severity = eventType === "PAYMENT_FAILED" ? "WARNING" : "INFO";

    await this.logEvent(
      eventType,
      userId,
      {
        order_id: orderId,
        ...orderData,
        timestamp: new Date().toISOString(),
      },
      severity
    );
  }
}

/**
 * Factory function pour créer un EventLogger
 */
export async function createEventLogger(): Promise<EventLogger> {
  const supabase = await createSupabaseServerClient();
  return new EventLogger(supabase);
}

/**
 * Fonction utilitaire pour logger rapidement un événement
 */
export async function logEvent(
  eventType: EventType,
  userId?: string,
  data?: Record<string, unknown>,
  severity: EventSeverity = "INFO"
): Promise<void> {
  const logger = await createEventLogger();
  await logger.logEvent(eventType, userId, data, severity);
}
