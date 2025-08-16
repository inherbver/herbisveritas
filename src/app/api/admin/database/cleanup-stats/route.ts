import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkAdminRole } from "@/lib/auth/admin-service";

/**
 * API Route pour récupérer les statistiques de nettoyage de la base de données
 * Accès : Admin uniquement
 */
export async function GET(request: NextRequest) {
  try {
    // Vérification de l'autorisation admin
    const isAdmin = await checkAdminRole();
    if (!isAdmin) {
      return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();

    // Appeler la fonction SQL pour obtenir les statistiques
    const { data, error } = await supabase.rpc("get_cleanup_stats");

    if (error) {
      console.error("Erreur récupération stats cleanup:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des statistiques" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erreur API cleanup-stats:", error);
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 });
  }
}
