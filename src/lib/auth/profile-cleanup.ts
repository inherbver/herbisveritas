import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Diagnostic and cleanup utility for profile issues
 */
export class ProfileCleanupService {
  /**
   * Check for duplicate profiles in the database
   */
  async findDuplicateProfiles() {
    const supabase = await createSupabaseServerClient();
    
    const { data: duplicates, error } = await supabase
      .from("profiles")
      .select("id, created_at")
      .order("id, created_at");

    if (error) {
      console.error("Error finding duplicate profiles:", error);
      return [];
    }

    const duplicateMap = new Map<string, number>();
    const duplicateUsers: string[] = [];

    duplicates?.forEach((profile: { id: string; created_at: string }) => {
      const count = duplicateMap.get(profile.id) || 0;
      duplicateMap.set(profile.id, count + 1);
      
      if (count === 1) { // Second occurrence
        duplicateUsers.push(profile.id);
      }
    });

    return duplicateUsers;
  }

  /**
   * Get profile count for a specific user
   */
  async getProfileCount(userId: string) {
    const supabase = await createSupabaseServerClient();
    
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("id", userId);

    if (error) {
      console.error(`Error counting profiles for user ${userId}:`, error);
      return 0;
    }

    return count || 0;
  }

  /**
   * Clean up duplicate profiles for a specific user
   * Keeps the oldest profile (first created_at)
   */
  async cleanupUserDuplicates(userId: string) {
    try {
      const supabase = await createSupabaseServerClient();
      
      // Get all profiles for this user, ordered by creation date
      const { data: profiles, error: fetchError } = await supabase
        .from("profiles")
        .select("id, created_at")
        .eq("id", userId)
        .order("created_at", { ascending: true });

      if (fetchError) {
        console.error(`Error fetching profiles for user ${userId}:`, fetchError);
        return { success: false, error: fetchError.message };
      }

      if (!profiles || profiles.length <= 1) {
        return { success: true, message: "No duplicates found" };
      }

      // Keep the first (oldest) profile, delete the rest
      const profilesToDelete = profiles.slice(1);
      
      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId)
        .not("created_at", "eq", profiles[0].created_at);

      if (deleteError) {
        console.error(`Error deleting duplicate profiles for user ${userId}:`, deleteError);
        return { success: false, error: deleteError.message };
      }

      return { 
        success: true, 
        message: `Removed ${profilesToDelete.length} duplicate profile(s)` 
      };

    } catch (error) {
      console.error(`Unexpected error cleaning up profiles for user ${userId}:`, error);
      return { success: false, error: "Unexpected error occurred" };
    }
  }

  /**
   * Ensure a user has exactly one profile
   * Creates one if missing, cleans up if duplicates exist
   */
  async ensureSingleProfile(userId: string, userEmail?: string) {
    const profileCount = await this.getProfileCount(userId);

    if (profileCount === 0) {
      const supabase = await createSupabaseServerClient();
      
      // Create missing profile
      const { error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          role: "user",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error(`Error creating profile for user ${userId}:`, error);
        return { success: false, error: error.message };
      }

      return { success: true, message: "Profile created" };
    }

    if (profileCount > 1) {
      // Clean up duplicates
      return await this.cleanupUserDuplicates(userId);
    }

    return { success: true, message: "Profile is valid" };
  }
}

/**
 * Singleton instance for easy access
 */
export const profileCleanup = new ProfileCleanupService();
