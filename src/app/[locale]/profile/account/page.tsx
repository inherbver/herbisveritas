"use client";

import { useTranslations } from "next-intl";

export default function AccountPage() {
  const t = useTranslations("ProfileNav"); // Ou un namespace dédié comme 'AccountPage'

  return (
    <section aria-labelledby="account-page-title">
      <h1 id="account-page-title" className="mb-6 text-2xl font-semibold">
        {t("account")}
      </h1>
      <div className="rounded-lg bg-white p-6 shadow">
        <p className="text-gray-700">
          Bienvenue sur la page de votre compte. Ici, vous pourrez bientôt gérer vos informations
          personnelles, vos préférences et plus encore.
        </p>
        {/* D'autres éléments de la page du compte viendront ici */}
      </div>
    </section>
  );
}
