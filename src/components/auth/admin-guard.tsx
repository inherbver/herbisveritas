"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAdminRole, type UserRole } from "@/lib/auth/types";
import { Loader2 } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

/**
 * Composant de protection côté client pour les zones admin
 * Double vérification de sécurité en plus du middleware
 */
export function AdminGuard({
  children,
  fallback = null,
  redirectTo = "/unauthorized",
}: AdminGuardProps) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifyAdminAccess = async () => {
      try {
        const supabase = createClient();

        // Vérifier l'authentification
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          console.warn("AdminGuard: No authenticated user");
          setIsAuthorized(false);
          router.push(redirectTo);
          return;
        }

        // Vérifier le rôle dans le profil
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role, status")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          console.warn("AdminGuard: Failed to fetch user profile");
          setIsAuthorized(false);
          router.push(redirectTo);
          return;
        }

        // Vérifier le statut du compte
        if (profile.status === "suspended" || profile.status === "deleted") {
          console.warn("AdminGuard: Account is suspended or deleted");
          setIsAuthorized(false);
          router.push(redirectTo);
          return;
        }

        // Vérifier le rôle admin
        const role = profile.role as UserRole | null;
        const hasAdminRole = role && isAdminRole(role);

        if (!hasAdminRole) {
          console.warn("AdminGuard: User does not have admin role", { role });
          setIsAuthorized(false);
          router.push(redirectTo);
          return;
        }

        // Double vérification : vérifier aussi dans les métadonnées de l'utilisateur
        const userMetadataRole = user.app_metadata?.role;
        if (userMetadataRole && userMetadataRole !== role) {
          console.error("AdminGuard: Role mismatch detected!", {
            profileRole: role,
            metadataRole: userMetadataRole,
          });
          // En cas de désaccord, utiliser le rôle le plus restrictif (non-admin)
          setIsAuthorized(false);
          router.push(redirectTo);
          return;
        }

        // Tout est OK
        console.log("AdminGuard: Admin access verified", {
          userId: user.id,
          role,
        });
        setIsAuthorized(true);
      } catch (error) {
        console.error(
          "AdminGuard: Unexpected error during verification",
          error,
        );
        setIsAuthorized(false);
        router.push(redirectTo);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyAdminAccess();

    // Écouter les changements d'authentification
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsAuthorized(false);
        router.push(redirectTo);
      } else if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        // Revérifier en cas de mise à jour
        verifyAdminAccess();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, redirectTo]);

  // Afficher un loader pendant la vérification
  if (isVerifying) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Vérification des droits d'accès...
          </p>
        </div>
      </div>
    );
  }

  // Si non autorisé, afficher le fallback ou rien
  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  // Autorisé : afficher le contenu
  return <>{children}</>;
}
