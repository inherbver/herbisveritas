import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect as navRedirect } from "next/navigation";
import Link from "next/link";
import { LOGIN_REDIRECT_URL } from "@/lib/constants";
import { ProfileData } from "@/types/profile";
import { Metadata } from "next";
import { LogoutButton } from "@/components/domain/profile/logout-button"; // Import LogoutButton

// Minimal Address type definition (ideally import from a shared types file)
interface Address {
  id: string;
  user_id: string;
  address_type: "shipping" | "billing";
  is_default: boolean;
  company_name?: string | null;
  full_name?: string | null;
  address_line1: string;
  address_line2?: string | null;
  postal_code: string;
  city: string;
  country_code: string; // Matches 'addresses' table
  state_province_region?: string | null;
  phone_number?: string | null;
  created_at: string;
  updated_at: string;
}

// Helper component to display an address (can be moved to a separate file)
// This is a simplified version of DisplayAddress from AddressesPage
const AccountDisplayAddress = ({
  address,
  title,
  t, // translations from AccountPage
}: {
  address: Address | null;
  title: string;
  t: (key: string) => string; // More specific type for t function
}) => {
  if (!address) {
    return (
      <>
        <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>
        <p className="text-muted-foreground">{t("addressNotProvided")}</p>
      </>
    );
  }

  return (
    <>
      <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {address.full_name && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              {t("addressFields.fullName")}
            </dt>
            <dd className="mt-1 text-base text-foreground">{address.full_name}</dd>
          </div>
        )}
        {address.company_name && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              {t("addressFields.companyName")}
            </dt>
            <dd className="mt-1 text-base text-foreground">{address.company_name}</dd>
          </div>
        )}
        <div className="sm:col-span-2">
          <dt className="text-sm font-medium text-muted-foreground">{t("addressFields.line1")}</dt>
          <dd className="mt-1 text-base text-foreground">{address.address_line1}</dd>
        </div>
        {address.address_line2 && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              {t("addressFields.line2")}
            </dt>
            <dd className="mt-1 text-base text-foreground">{address.address_line2}</dd>
          </div>
        )}
        <div className="sm:col-span-1">
          <dt className="text-sm font-medium text-muted-foreground">
            {t("addressFields.postalCode")}
          </dt>
          <dd className="mt-1 text-base text-foreground">{address.postal_code}</dd>
        </div>
        <div className="sm:col-span-1">
          <dt className="text-sm font-medium text-muted-foreground">{t("addressFields.city")}</dt>
          <dd className="mt-1 text-base text-foreground">{address.city}</dd>
        </div>
        {address.state_province_region && (
          <div className="sm:col-span-1">
            <dt className="text-sm font-medium text-muted-foreground">
              {t("addressFields.stateProvinceRegion")}
            </dt>
            <dd className="mt-1 text-base text-foreground">{address.state_province_region}</dd>
          </div>
        )}
        <div className={address.state_province_region ? "sm:col-span-1" : "sm:col-span-2"}>
          <dt className="text-sm font-medium text-muted-foreground">
            {t("addressFields.country")}
          </dt>
          <dd className="mt-1 text-base text-foreground">{address.country_code}</dd>
        </div>
        {address.phone_number && (
          <div className="sm:col-span-2">
            <dt className="text-sm font-medium text-muted-foreground">
              {t("addressFields.phone")}
            </dt>
            <dd className="mt-1 text-base text-foreground">{address.phone_number}</dd>
          </div>
        )}
      </dl>
    </>
  );
};

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
      terms_accepted_at,
      billing_address_is_different
    `
    )
    .eq("id", user.id)
    .single<
      Omit<
        ProfileData,
        | "shipping_address_line1"
        | "shipping_address_line2"
        | "shipping_postal_code"
        | "shipping_city"
        | "shipping_country"
        | "billing_address_line1"
        | "billing_address_line2"
        | "billing_postal_code"
        | "billing_city"
        | "billing_country"
      >
    >();

  // Fetch addresses from the 'addresses' table
  const { data: userAddresses, error: addressesError } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("address_type", { ascending: true });

  if (addressesError) {
    console.error("Error fetching user addresses:", addressesError);
    // Handle error appropriately, maybe show a message to the user
  }

  let displayShippingAddress: Address | null = null;
  let displayBillingAddress: Address | null = null;

  if (userAddresses) {
    displayShippingAddress =
      userAddresses.find(
        (addr: Address) => addr.address_type === "shipping" && addr.is_default === true
      ) ||
      userAddresses.find((addr: Address) => addr.address_type === "shipping") ||
      null;

    displayBillingAddress =
      userAddresses.find(
        (addr: Address) => addr.address_type === "billing" && addr.is_default === true
      ) ||
      userAddresses.find((addr: Address) => addr.address_type === "billing") ||
      null;
  }

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
    terms_accepted_at: profile?.terms_accepted_at,
    billing_address_is_different: profile?.billing_address_is_different || false,
    // Addresses will be handled by the new display components
    shippingAddress: displayShippingAddress,
    billingAddress: displayBillingAddress,
  };

  return (
    <section className="space-y-8 rounded-lg bg-card p-6 shadow-lg md:p-8">
      <header>
        <h1 className="mb-8 text-3xl font-bold text-foreground">{t("title")}</h1>
      </header>

      {/* Section Informations Personnelles */}
      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("generalInfo.title")}</h2>
            <Link
              href={`/${currentLocale}/profile/account/edit`}
              className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {tGlobal("edit")}
            </Link>
          </div>
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

      {/* Section Adresses */}
      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("addresses.title")}</h2>{" "}
            {/* Предполагая ключ t("addresses.title") */}
            <Link
              href={`/${currentLocale}/profile/addresses`}
              className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {tGlobal("manage")}
            </Link>
          </div>
          <AccountDisplayAddress
            address={userInfo.shippingAddress}
            title={
              userInfo.billing_address_is_different
                ? t("shippingAddress.title")
                : t("shippingAndBillingAddress.title")
            }
            t={t}
          />
        </div>

        {userInfo.billing_address_is_different && (
          <>
            <hr className="my-4 border-border" />
            <div className="px-4 py-5 sm:p-6">
              <AccountDisplayAddress
                address={userInfo.billingAddress}
                title={t("billingAddress.title")}
                t={t}
              />
            </div>
          </>
        )}
      </article>

      {/* Section Mon Mot de Passe */}
      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("password.sectionTitle")}</h2>{" "}
            {/* Clef à ajouter: "Mon Mot de Passe"*/}
            <Link
              href={`/${currentLocale}/profile/password`}
              className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {tGlobal("edit")}
            </Link>
          </div>
          <p className="text-muted-foreground">{t("password.description")}</p>{" "}
          {/* Clef à ajouter: "Modifiez votre mot de passe ici." */}
        </div>
      </article>

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

      {/* Section Déconnexion */}
      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("logout.sectionTitle")}</h2>{" "}
            {/* Clef à ajouter */}
            <LogoutButton />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("logout.description")}{" "}
            {/* Clef à ajouter: "Vous serez déconnecté de votre session actuelle." */}
          </p>
        </div>
      </article>
    </section>
  );
}
