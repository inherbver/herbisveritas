import { ReactNode, Suspense } from "react";
import { redirect } from "next/navigation"; // App Router
import { getSupabaseUserSession } from "@/lib/supabase/server";
import ProfileNavLinks from "./ProfileNavLinks";
import Loading from "../loading";
import { getTranslations } from "next-intl/server"; // Import pour Server Component

interface ProfileLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

// Ne pas déstructurer params dans la signature ici
export default async function ProfileLayout(props: ProfileLayoutProps) {
  const { locale } = await props.params; // Await params

  // loginRedirectUrl peut être défini ici car il ne dépend que de locale
  const loginRedirectUrl = `/${locale}/login`;

  // Obtenir les traductions pour le Server Component
  const t = await getTranslations({ locale, namespace: "Global" });

  // Utilise la nouvelle fonction utilitaire pour obtenir la session
  const session = await getSupabaseUserSession();

  if (!session) {
    redirect(loginRedirectUrl);
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
        <aside className="md:col-span-3 lg:col-span-2" aria-labelledby="profile-navigation-title">
          <h2 id="profile-navigation-title" className="sr-only">
            {t("profileNavigation")}
          </h2>
          <ProfileNavLinks />
        </aside>
        <main className="md:col-span-9 lg:col-span-10">
          <Suspense fallback={<Loading />}>{props.children}</Suspense>
        </main>
      </div>
    </div>
  );
}
