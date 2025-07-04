"use server";

import { withPermissionSafe } from "@/lib/auth/server-actions-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface UserForAdminPanel {
  id: string;
  email: string;
  full_name: string | null;
  role: string | null;
  created_at: string;
  last_sign_in_at: string | null;
}

export const getUsers = withPermissionSafe("users:read:all", async (): Promise<UserForAdminPanel[]> => {
  const supabase = createSupabaseAdminClient();

  // 1. Get all users from auth.users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

  if (usersError) {
    console.error("Error fetching users:", usersError);
    throw new Error("Impossible de récupérer les utilisateurs.");
  }

  // 2. Get all profiles from public.profiles
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role");

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    throw new Error("Impossible de récupérer les profils.");
  }

  // 3. Combine data
  const combinedUsers: UserForAdminPanel[] = users.map(user => {
    const profile = profiles?.find(p => p.id === user.id);
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || null;

    return {
      id: user.id,
      email: user.email || "",
      full_name: fullName,
      // Prioritize JWT role, fallback to profile role
      role: user.app_metadata.role || profile?.role || "user",
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at || null,
    };
  });

  return combinedUsers;
});
