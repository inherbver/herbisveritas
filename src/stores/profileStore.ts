import { create } from "zustand";
import { ProfileData } from "@/types/profile";

// Supposons de futures Server Actions pour récupérer/mettre à jour les données d'un profil par l'admin
// import { fetchUserProfileForAdmin } from '@/actions/adminProfileActions';
// import { updateUserProfileByAdmin } from '@/actions/adminProfileActions';

interface AdminProfileEditState {
  isEditingByAdmin: boolean; // Vrai si l'admin est en train d'éditer un profil
  editingUserId: string | null; // L'ID de l'utilisateur dont le profil est édité
  profileDataForEdit: ProfileData | null; // Les données du profil en cours d'édition
  isLoading: boolean; // Indicateur de chargement des données du profil
  error: string | null; // Pour stocker les erreurs éventuelles
}

interface AdminProfileEditActions {
  startAdminEdit: (userId: string) => Promise<void>;
  updateAdminEditFormField: <K extends keyof ProfileData>(field: K, value: ProfileData[K]) => void;
  submitAdminEdit: () => Promise<boolean>;
  clearAdminEdit: () => void;
}

export const useProfileStore = create<AdminProfileEditState & { actions: AdminProfileEditActions }>(
  (set, get) => ({
    // État initial
    isEditingByAdmin: false,
    editingUserId: null,
    profileDataForEdit: null,
    isLoading: false,
    error: null,

    // Actions
    actions: {
      startAdminEdit: async (userId) => {
        set({
          isLoading: true,
          error: null,
          isEditingByAdmin: true,
          editingUserId: userId,
          profileDataForEdit: null,
        });
        try {
          // TODO: Remplacer par un appel à une vraie Server Action sécurisée pour l'admin
          // const data = await fetchUserProfileForAdmin(userId);
          // Simulation pour l'instant:
          console.log(`[ProfileStore] Simulating fetch for userId: ${userId}`);
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simule une latence réseau
          const data: ProfileData = {
            first_name: `AdminEdit-${userId.substring(0, 5)}`,
            last_name: "User",
            phone_number: "0123456789",
            role: "user",
            shipping_address_line1: null,
            shipping_address_line2: null,
            shipping_postal_code: null,
            shipping_city: null,
            shipping_country: null,
            terms_accepted_at: null,
          };

          if (!data) {
            // Gérer le cas où l'utilisateur n'est pas trouvé
            throw new Error("Profil utilisateur non trouvé.");
          }
          set({ profileDataForEdit: data, isLoading: false });
        } catch (err) {
          console.error("[ProfileStore] Error in startAdminEdit:", err);
          set({
            error:
              err instanceof Error ? err.message : "Erreur inconnue lors du chargement du profil.",
            isLoading: false,
            isEditingByAdmin: false,
            editingUserId: null,
          });
        }
      },

      updateAdminEditFormField: (field, value) => {
        set((state) => ({
          profileDataForEdit: state.profileDataForEdit
            ? { ...state.profileDataForEdit, [field]: value }
            : null,
        }));
      },

      submitAdminEdit: async () => {
        const { editingUserId, profileDataForEdit } = get();
        if (!editingUserId || !profileDataForEdit) {
          set({ error: "Aucun profil en cours d'édition ou données manquantes." });
          return false;
        }
        set({ isLoading: true, error: null });
        try {
          // TODO: Remplacer par un appel à une vraie Server Action sécurisée pour l'admin
          // const success = await updateUserProfileByAdmin(editingUserId, profileDataForEdit);
          // Simulation pour l'instant:
          console.log(
            `[ProfileStore] Simulating update for userId: ${editingUserId}`,
            profileDataForEdit
          );
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simule une latence réseau
          const success = true;

          if (!success) {
            throw new Error("Échec de la mise à jour du profil.");
          }

          set({
            isLoading: false,
            isEditingByAdmin: false,
            editingUserId: null,
            profileDataForEdit: null,
          });
          // Optionnel: Ici, on pourrait appeler une fonction pour revalider les chemins ou afficher un toast global
          return true;
        } catch (err) {
          console.error("[ProfileStore] Error in submitAdminEdit:", err);
          set({
            error: err instanceof Error ? err.message : "Erreur inconnue lors de la mise à jour.",
            isLoading: false,
          });
          return false;
        }
      },

      clearAdminEdit: () => {
        set({
          isEditingByAdmin: false,
          editingUserId: null,
          profileDataForEdit: null,
          isLoading: false,
          error: null,
        });
      },
    },
  })
);

// Sélecteurs pour un accès facile et optimisé aux différentes parties du store
export const useIsEditingByAdmin = () => useProfileStore((state) => state.isEditingByAdmin);
export const useEditingUserId = () => useProfileStore((state) => state.editingUserId);
export const useProfileDataForEdit = () => useProfileStore((state) => state.profileDataForEdit);
export const useProfileStoreIsLoading = () => useProfileStore((state) => state.isLoading);
export const useProfileStoreError = () => useProfileStore((state) => state.error);
export const useProfileStoreActions = () => useProfileStore((state) => state.actions);
