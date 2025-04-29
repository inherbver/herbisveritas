"use client"; // Marquer comme Client Component car utilise useTranslations

import { useTranslations } from "next-intl";

// Vous pourrez décommenter Header/Footer quand ils seront intégrés
// import { Header } from '@/components/shared/header';
// import { Footer } from '@/components/shared/footer';

export default function HomePage() {
  // Supprimé: unstable_setRequestLocale(locale); - Incompatible avec 'use client'

  const t = useTranslations("HomePage"); // Assurez-vous d'avoir une section HomePage dans vos fichiers messages (ex: en.json)

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      {/* <Header /> */}
      <div className="container mx-auto py-12">
        {/* Utilisation de defaultValue pour éviter les erreurs si la clé manque */}
        <h1 className="mb-4 text-4xl font-bold">
          {t("title", { defaultValue: "Bienvenue sur Inherbis" })}
        </h1>
        <p>{t("description", { defaultValue: "Votre page d'accueil." })}</p>
      </div>
      {/* <Footer /> */}
    </main>
  );
}
