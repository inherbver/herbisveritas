/**
 * Service pour la gestion de la livraison et des points de retrait
 */

import { createSupabaseServerClient, createAdminClient } from "@/lib/supabase/server";
import { ActionResult } from "@/lib/core/result";
import { LogUtils } from "@/lib/core/logger";
import { ErrorUtils } from "@/lib/core/errors";
import type { PointRetrait } from "@/mocks/colissimo-data";

export interface OrderPickupPoint {
  id: string;
  order_id: string;
  pickup_id: string;
  service_code?: string;
  name: string;
  commercial_name?: string;
  company?: string;
  address_1: string;
  address_2?: string;
  address_3?: string;
  zip_code: string;
  city: string;
  country_code: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  type_de_point?: string;
  horaires_ouverture?: string;
  created_at: string;
}

export interface ShippingUpdateData {
  tracking_number?: string;
  tracking_url?: string;
  shipped_at?: string;
  delivered_at?: string;
}

/**
 * Service de gestion de la livraison
 */
export class ShippingService {
  /**
   * Sauvegarder un point de retrait sélectionné pour une commande
   */
  static async savePickupPoint(
    orderId: string,
    pickupPoint: PointRetrait
  ): Promise<ActionResult<OrderPickupPoint>> {
    const context = LogUtils.createUserActionContext("system", "save_pickup_point", "shipping");

    try {
      const supabase = await createSupabaseServerClient();

      // Vérifier que la commande existe
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id")
        .eq("id", orderId)
        .single();

      if (orderError || !order) {
        return ActionResult.error("Commande introuvable");
      }

      // Préparer les données du point de retrait
      const pickupData = {
        order_id: orderId,
        pickup_id: pickupPoint.pickup_id || pickupPoint.id,
        service_code: pickupPoint.service_code,
        name: pickupPoint.name,
        commercial_name: pickupPoint.commercial_name,
        company: pickupPoint.company,
        address_1: pickupPoint.address_1 || pickupPoint.address,
        address_2: pickupPoint.address_2,
        address_3: pickupPoint.address_3,
        zip_code: pickupPoint.zipCode,
        city: pickupPoint.city,
        country_code: pickupPoint.country_code || "FR",
        phone: pickupPoint.phone,
        latitude: pickupPoint.latitude,
        longitude: pickupPoint.longitude,
        type_de_point: pickupPoint.typeDePoint,
        horaires_ouverture: pickupPoint.horairesOuverture,
      };

      // Insérer ou mettre à jour le point de retrait
      const { data, error } = await supabase
        .from("order_pickup_points")
        .upsert(pickupData, {
          onConflict: "order_id",
        })
        .select()
        .single();

      if (error) {
        LogUtils.logOperationError("save_pickup_point", error, context);
        return ActionResult.error("Erreur lors de la sauvegarde du point de retrait");
      }

      LogUtils.logOperationSuccess("save_pickup_point", {
        ...context,
        orderId,
        pickupId: pickupPoint.id,
      });

      return ActionResult.ok(data as OrderPickupPoint, "Point de retrait sauvegardé");
    } catch (error) {
      LogUtils.logOperationError("save_pickup_point", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Erreur lors de la sauvegarde du point de retrait"
      );
    }
  }

  /**
   * Récupérer le point de retrait d'une commande
   */
  static async getOrderPickupPoint(
    orderId: string
  ): Promise<ActionResult<OrderPickupPoint | null>> {
    try {
      const supabase = await createSupabaseServerClient();

      const { data, error } = await supabase
        .from("order_pickup_points")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Pas de point de retrait trouvé (livraison à domicile)
          return ActionResult.ok(null);
        }
        return ActionResult.error("Erreur lors de la récupération du point de retrait");
      }

      return ActionResult.ok(data as OrderPickupPoint);
    } catch (error) {
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Erreur lors de la récupération du point de retrait"
      );
    }
  }

  /**
   * Mettre à jour les informations de suivi d'une commande
   */
  static async updateShippingInfo(
    orderId: string,
    shippingData: ShippingUpdateData
  ): Promise<ActionResult<void>> {
    const context = LogUtils.createUserActionContext("system", "update_shipping_info", "shipping");

    try {
      const adminClient = createAdminClient();

      // Préparer les données de mise à jour
      const updateData: any = {};

      if (shippingData.tracking_number !== undefined) {
        updateData.tracking_number = shippingData.tracking_number;
      }

      if (shippingData.tracking_url !== undefined) {
        updateData.tracking_url = shippingData.tracking_url;
      }

      if (shippingData.shipped_at !== undefined) {
        updateData.shipped_at = shippingData.shipped_at;
        // Si on marque comme expédié, mettre à jour le statut
        updateData.status = "shipped";
      }

      if (shippingData.delivered_at !== undefined) {
        updateData.delivered_at = shippingData.delivered_at;
        // Si on marque comme livré, mettre à jour le statut
        updateData.status = "delivered";
      }

      const { error } = await adminClient.from("orders").update(updateData).eq("id", orderId);

      if (error) {
        LogUtils.logOperationError("update_shipping_info", error, context);
        return ActionResult.error("Erreur lors de la mise à jour des informations de livraison");
      }

      LogUtils.logOperationSuccess("update_shipping_info", {
        ...context,
        orderId,
        updates: Object.keys(updateData),
      });

      return ActionResult.ok(undefined, "Informations de livraison mises à jour");
    } catch (error) {
      LogUtils.logOperationError("update_shipping_info", error, context);
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Erreur lors de la mise à jour des informations de livraison"
      );
    }
  }

  /**
   * Générer une URL de suivi pour un transporteur
   */
  static generateTrackingUrl(carrier: string, trackingNumber: string): string {
    const carrierUrls: Record<string, string> = {
      colissimo: `https://www.laposte.fr/outils/suivre-vos-envois?code=${trackingNumber}`,
      chronopost: `https://www.chronopost.fr/tracking-no-cms/suivi-page?listeNumerosLT=${trackingNumber}`,
      ups: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      fedex: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`,
      dhl: `https://www.dhl.com/fr-fr/home/tracking/tracking-express.html?submit=1&tracking-id=${trackingNumber}`,
    };

    const baseUrl = carrierUrls[carrier.toLowerCase()];
    return baseUrl || `https://www.google.com/search?q=${trackingNumber}`;
  }

  /**
   * Récupérer toutes les méthodes de livraison actives
   */
  static async getActiveShippingMethods() {
    try {
      const supabase = await createSupabaseServerClient();

      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) {
        return ActionResult.error("Erreur lors de la récupération des méthodes de livraison");
      }

      return ActionResult.ok(data || []);
    } catch (error) {
      return ActionResult.error(
        ErrorUtils.isAppError(error)
          ? ErrorUtils.formatForUser(error)
          : "Erreur lors de la récupération des méthodes de livraison"
      );
    }
  }
}
