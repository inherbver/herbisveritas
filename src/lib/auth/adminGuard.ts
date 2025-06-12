import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";

// Types stricts pour la sécurité
type UserRole = "user" | "editor" | "admin" | "dev";
type AuthResult = {
  isAuthorized: boolean;
  user?: User;
  role?: UserRole;
  error?: string;
};

export async function checkAdminAccess(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();

    // 1. Vérification d'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.warn(`[Security] Auth error: ${authError.message}`);
      return { isAuthorized: false, error: "Authentication failed" };
    }

    if (!user) {
      return { isAuthorized: false, error: "Not authenticated" };
    }

    // 2. Vérification du profil avec validation stricte
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.warn(`[Security] Profile query error for user ${user.id}: ${profileError.message}`);
      return { isAuthorized: false, user, error: "Profile access failed" };
    }

    if (!profile) {
      console.warn(`[Security] No profile found for user ${user.id}`);
      return { isAuthorized: false, user, error: "Profile not found" };
    }

    // 3. Validation stricte du rôle avec typage
    const userRole = profile.role as string;
    const validRoles: UserRole[] = ["user", "editor", "admin", "dev"];

    if (!validRoles.includes(userRole as UserRole)) {
      console.error(`[Security] Invalid role detected: "${userRole}" for user ${user.id}`);
      return { isAuthorized: false, user, error: "Invalid role" };
    }

    const typedRole = userRole as UserRole;

    // 4. Vérification spécifique admin
    if (typedRole !== "admin") {
      console.warn(`[Security] Access denied - role "${typedRole}" for user ${user.id}`);
      return { isAuthorized: false, user, role: typedRole, error: "Insufficient privileges" };
    }

    // 5. Succès - log pour audit
    console.info(`[Security] Admin access granted to user ${user.id}`);
    return { isAuthorized: true, user, role: typedRole };
  } catch (error) {
    console.error(`[Security] Unexpected error in admin check:`, error);
    return { isAuthorized: false, error: "System error" };
  }
}
