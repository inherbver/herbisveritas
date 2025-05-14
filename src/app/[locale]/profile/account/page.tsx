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

  // Si aucun utilisateur n'est authentifié
  if (!user) {
    // Ne pas considérer l'absence de session comme une erreur serveur à logger pour un invité.
    // Rediriger vers la page de connexion.
    // Logger une erreur seulement si userError existe et n'est pas une AuthSessionMissingError.
    if (userError && userError.name !== "AuthSessionMissingError") {
      console.error("Error fetching user:", userError);
    }
    const redirectTo = `/${currentLocale}${LOGIN_REDIRECT_URL}?next=/profile/account`;
    return navRedirect(redirectTo); // Utiliser return pour arrêter l'exécution ici
  }

  // Si userError existe même si user est potentiellement non-null (moins courant)
  if (userError) {
    console.error("An error occurred while fetching user data:", userError);
    const redirectTo = `/${currentLocale}${LOGIN_REDIRECT_URL}?next=/profile/account`;
    return navRedirect(redirectTo); // Utiliser return pour arrêter l'exécution ici
  }

  // À ce stade, l'utilisateur est authentifié et userError est null.
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
      terms_accepted_at,
      billing_address_is_different,
      billing_address_line1,
      billing_address_line2,
      billing_postal_code,
      billing_city,
      billing_country
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
    billing_address_is_different: profile?.billing_address_is_different || false,
    billing_address_line1: profile?.billing_address_line1 || "",
    billing_address_line2: profile?.billing_address_line2 || "",
    billing_postal_code: profile?.billing_postal_code || "",
    billing_city: profile?.billing_city || "",
    billing_country: profile?.billing_country || "",
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

      {/* Section Informations Personnelles et Adresses */}
      <article
        id="personal-info-addresses"
        className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg"
      >
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
            {userInfo.billing_address_is_different
              ? t("shippingAddress.title")
              : t("shippingAndBillingAddress.title")}
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

      {/* Section Adresse de Facturation (si différente) */}
      {userInfo.billing_address_is_different && (
        <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {t("billingAddress.title")}
            </h2>
            {userInfo.billing_postal_code || userInfo.billing_city ? (
              <dl className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("shippingAddress.line1")} {/* Réutilisation de la clé */}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">
                    {userInfo.billing_address_line1 || tGlobal("notProvided")}
                  </dd>
                </div>
                {userInfo.billing_address_line2 && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {t("shippingAddress.line2")} {/* Réutilisation de la clé */}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold text-foreground">
                      {userInfo.billing_address_line2}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("shippingAddress.postalCode")} {/* Réutilisation de la clé */}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">
                    {userInfo.billing_postal_code || tGlobal("notProvided")}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("shippingAddress.city")} {/* Réutilisation de la clé */}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">
                    {userInfo.billing_city || tGlobal("notProvided")}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-muted-foreground">
                    {t("shippingAddress.country")} {/* Réutilisation de la clé */}
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-foreground">
                    {userInfo.billing_country || tGlobal("notProvided")}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground">
                {/* Peut-être une clé billingAddress.notProvided ? Pour l'instant, réutilisation. */}{" "}
                {t("shippingAddress.notProvided")}
              </p>
            )}
          </div>
        </article>
      )}

      {/* Section Mes Commandes */}
      <article
        id="my-orders"
        className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("orders.title")}</h2>
            <Link
              href={`/${currentLocale}/profile/orders`}
              className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("orders.viewLink")}
            </Link>
          </div>
        </div>
      </article>

      {/* Section Mon Mot de Passe */}
      <article
        id="change-password"
        className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg"
      >
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("password.title")}</h2>
            <Link
              href={`/${currentLocale}/profile/change-password`}
              className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t("password.changeLink")}
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}
