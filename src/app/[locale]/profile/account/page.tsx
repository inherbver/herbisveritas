import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect as navRedirect } from "next/navigation";
import Link from "next/link";
import { LOGIN_REDIRECT_URL } from "@/lib/constants";
import { ProfileData } from "@/types/profile";
import { Metadata } from "next";

// Helper pour formater la date
function formatDate(dateString: string | null | undefined, locale: string): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface AccountPageProps {
  params: { locale: string };
}

export async function generateMetadata(props: AccountPageProps): Promise<Metadata> {
  const { locale: currentLocale } = await props.params;
  const t = await getTranslations({ locale: currentLocale, namespace: "AccountPage" });
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function AccountPage(props: AccountPageProps) {
  const { locale: currentLocale } = await props.params;

  const t = await getTranslations({ locale: currentLocale, namespace: "AccountPage" });
  const tGlobal = await getTranslations({ locale: currentLocale, namespace: "Global" });

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("Error fetching user or no user found:", userError);
    const redirectTo = `/${currentLocale}${LOGIN_REDIRECT_URL}?next=/profile/account`;
    navRedirect(redirectTo);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      `
      first_name,
      last_name,
      phone_number,
      role,
      shipping_address_line1,
      shipping_address_line2,
      shipping_postal_code,
      shipping_city,
      shipping_country,
      terms_accepted_at
    `
    )
    .eq("id", user.id)
    .single<ProfileData>();

  if (profileError && profileError.code !== "PGRST116") {
    console.error("Error fetching profile:", profileError);
    // Afficher un message d'erreur plus visible à l'utilisateur pourrait être une amélioration
  }

  const userInfo = {
    firstName: profile?.first_name || "",
    lastName: profile?.last_name || "",
    email: user.email || "",
    phone: profile?.phone_number || user.phone || "",
    role: profile?.role || tGlobal("roles.user"),
    accountCreated: user.created_at,
    shipping_address_line1: profile?.shipping_address_line1 || "",
    shipping_address_line2: profile?.shipping_address_line2 || "",
    shipping_postal_code: profile?.shipping_postal_code || "",
    shipping_city: profile?.shipping_city || "",
    shipping_country: profile?.shipping_country || "",
    terms_accepted_at: profile?.terms_accepted_at,
  };

  return (
    <section className="space-y-8 rounded-lg bg-card p-6 shadow-lg md:p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <Link
          href={`/${currentLocale}/profile/account/edit`}
          className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {tGlobal("edit_profile")}
        </Link>
      </header>

      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{t("generalInfo.title")}</h2>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("generalInfo.firstName")}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {userInfo.firstName || tGlobal("notProvided")}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("generalInfo.lastName")}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {userInfo.lastName || tGlobal("notProvided")}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("generalInfo.email")}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">{userInfo.email}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("generalInfo.phone")}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {userInfo.phone || tGlobal("notProvided")}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">{t("generalInfo.role")}</dt>
              <dd className="mt-1 text-lg font-semibold capitalize text-foreground">
                {userInfo.role}
              </dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("generalInfo.accountCreated")}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {formatDate(userInfo.accountCreated, currentLocale)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-muted-foreground">{t("terms.status")}</dt>
              <dd className="mt-1 text-lg font-semibold text-foreground">
                {userInfo.terms_accepted_at
                  ? `${t("terms.acceptedOn")} ${formatDate(userInfo.terms_accepted_at, currentLocale)}`
                  : t("terms.notAccepted")}
              </dd>
            </div>
          </dl>
        </div>
      </article>

      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {t("shippingAddress.title")}
          </h2>
          {userInfo.shipping_postal_code || userInfo.shipping_city ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("shippingAddress.line1")}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {userInfo.shipping_address_line1 || tGlobal("notProvided")}
                </dd>
              </div>
              {userInfo.shipping_address_line2 && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("shippingAddress.line2")}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">
                    {userInfo.shipping_address_line2}
                  </dd>
                </div>
              )}
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("shippingAddress.postalCode")}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {userInfo.shipping_postal_code || tGlobal("notProvided")}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("shippingAddress.city")}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {userInfo.shipping_city || tGlobal("notProvided")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">
                  {t("shippingAddress.country")}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-foreground">
                  {userInfo.shipping_country || tGlobal("notProvided")}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted-foreground">{t("shippingAddress.notProvided")}</p>
          )}
        </div>
      </article>
    </section>
  );
}
