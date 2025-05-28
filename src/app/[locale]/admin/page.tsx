// src/app/[locale]/admin/page.tsx
import { Locale } from "@/i18n-config";

interface AdminPageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function AdminPage(_props: AdminPageProps) {
  // const { locale } = await props.params;
  // now you can safely use `locale`…

  // const t = await getTranslations({ locale, namespace: "AdminPage" });

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">
        {/* {t('title')} */}
        Admin Dashboard - Main Page
      </h1>
      <p>
        {/* {t('welcomeMessage')} */}
        Welcome to the admin area. More features will be added here soon.
      </p>
    </div>
  );
}
