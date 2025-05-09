import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect as navRedirect } from "next/navigation";
import { LOGIN_REDIRECT_URL } from "@/lib/constants";

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  role: string | null;
}

interface Props {
  params: Promise<{ locale: string }>;
}

// Helper pour formater la date
function formatDate(dateString: string, locale: string) {
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "AccountPage" });
  const tGlobal = await getTranslations({ locale, namespace: "Global" });

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error fetching user or no user found:", userError);
    const redirectTo = `/${locale}${LOGIN_REDIRECT_URL}?next=/profile/account`;
    navRedirect(redirectTo);
  }

  // Récupérer les informations du profil depuis la table 'profiles'
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("first_name, last_name, phone_number, role")
    .eq("id", user.id)
    .single<ProfileData>();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error fetching profile:", profileError);
  }

  const userInfo = {
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    email: user.email || "",
    phone: profile?.phone_number || user.phone || "",
    role: profile?.role || "user",
    accountCreated: user.created_at,
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">{t("title")}</h1>
      </header>

      <div className="overflow-hidden bg-white shadow sm:rounded-lg dark:bg-gray-800">
        <div className="px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("firstName")}
              </dt>
              <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {userInfo.firstName || tGlobal("notProvided")}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("lastName")}
              </dt>
              <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {userInfo.lastName || tGlobal("notProvided")}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("email")}</dt>
              <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">{userInfo.email}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{t("phone")}</dt>
              <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {userInfo.phone || tGlobal("notProvided")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t("accountCreated")}
              </dt>
              <dd className="mt-1 text-lg text-gray-900 dark:text-gray-100">
                {userInfo.accountCreated
                  ? formatDate(userInfo.accountCreated, locale)
                  : tGlobal("notProvided")}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">{t("editHint")}</p>
    </section>
  );
}
