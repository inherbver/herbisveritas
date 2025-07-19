"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import useAddressStore, {
  selectAddresses,
  selectIsLoading,
  selectError,
} from "@/stores/addressStore";
import { Address } from "@/types";

export function useAddresses() {
  const addresses = useAddressStore(selectAddresses);
  const isLoading = useAddressStore(selectIsLoading);
  const error = useAddressStore(selectError);

  const {
    setAddresses,
    setIsLoading,
    setError,
    addAddress: addAddressToStore,
    updateAddress: updateAddressInStore,
    removeAddress: removeAddressFromStore,
    clearAddresses,
  } = useAddressStore();

  const supabase = createClient();

  // Charger les adresses depuis la base de données
  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        clearAddresses();
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      // Transformer les données si nécessaire
      const transformedAddresses: Address[] = (data || []).map((addr) => ({
        ...addr,
        email: addr.email || undefined, // Convertir null vers undefined
      }));

      setAddresses(transformedAddresses);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur lors du chargement des adresses";
      setError(errorMessage);
      console.error("Error fetching addresses:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, setAddresses, setIsLoading, setError, clearAddresses]);

  // Ajouter une nouvelle adresse
  const addAddress = useCallback(
    async (addressData: Omit<Address, "id" | "user_id" | "created_at" | "updated_at">) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Utilisateur non authentifié");
        }

        const { data, error } = await supabase
          .from("addresses")
          .insert([{ ...addressData, user_id: user.id }])
          .select()
          .single();

        if (error) throw error;

        const newAddress: Address = {
          ...data,
          email: data.email || undefined,
        };

        addAddressToStore(newAddress);
        return { success: true, data: newAddress };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur lors de l'ajout de l'adresse";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [supabase, addAddressToStore, setError]
  );

  // Mettre à jour une adresse
  const updateAddress = useCallback(
    async (addressId: string, addressData: Partial<Address>) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Utilisateur non authentifié");
        }

        const { data, error } = await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", addressId)
          .eq("user_id", user.id)
          .select()
          .single();

        if (error) throw error;

        const updatedAddress: Address = {
          ...data,
          email: data.email || undefined,
        };

        updateAddressInStore(addressId, updatedAddress);
        return { success: true, data: updatedAddress };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur lors de la mise à jour de l'adresse";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [supabase, updateAddressInStore, setError]
  );

  // Supprimer une adresse
  const removeAddress = useCallback(
    async (addressId: string) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("Utilisateur non authentifié");
        }

        const { error } = await supabase
          .from("addresses")
          .delete()
          .eq("id", addressId)
          .eq("user_id", user.id);

        if (error) throw error;

        removeAddressFromStore(addressId);
        return { success: true };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur lors de la suppression de l'adresse";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [supabase, removeAddressFromStore, setError]
  );

  // Charger les adresses au montage du composant
  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  // Écouter les changements d'authentification
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        fetchAddresses();
      } else if (event === "SIGNED_OUT") {
        clearAddresses();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchAddresses, clearAddresses]);

  return {
    addresses,
    isLoading,
    error,
    fetchAddresses,
    addAddress,
    updateAddress,
    removeAddress,
    // Adresses par type pour faciliter l'accès
    shippingAddress: addresses.find((addr) => addr.address_type === "shipping") || null,
    billingAddress: addresses.find((addr) => addr.address_type === "billing") || null,
  };
}
