import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LOGIN_REDIRECT_URL } from "@/lib/constants";
import type { Tables } from "@/types/supabase";
import { Metadata } from "next";
import { LogoutButton } from "@/components/domain/profile/logout-button";

// Use the generated type for addresses to ensure it's always in sync with the DB schema.
type Address = Tables<"addresses">;
type Profile = Tables<"profiles">;

// Helper component to display an address. This could be moved to a separate file.
const AccountDisplayAddress = ({
  address,
  title,
  t,
}: {
  address: Address | null;
  title: string;
  t: (key: string) => string;
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

interface AccountPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AccountPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "AccountPage",
  });
  return {
    title: t("metadata.title"),
    description: t("metadata.description"),
  };
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale: currentLocale } = await params;
  const t = await getTranslations({ locale: currentLocale, namespace: "AccountPage" });
  const tGlobal = await getTranslations({ locale: currentLocale, namespace: "Global" });

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    if (userError && userError.name !== "AuthSessionMissingError") {
      console.error("Error fetching user:", userError);
    }
    const redirectTo = `/${currentLocale}${LOGIN_REDIRECT_URL}?next=/profile/account`;
    redirect(redirectTo);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  const { data: userAddresses, error: addressesError } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .returns<Address[]>();

  if (profileError) {
    console.error("Error fetching profile data:", profileError);
    return (
      <section className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-destructive">{t("errors.userProfileNotFound")}</p>
      </section>
    );
  }

  if (addressesError) {
    console.error("Error fetching user addresses:", addressesError);
    // You might want to show a less disruptive error if only addresses fail
  }

  // FIX: Utiliser 'is_default' au lieu de 'is_default_shipping' et 'is_default_billing'
  // et filtrer par address_type pour déterminer les adresses par défaut
  const defaultShippingAddress =
    userAddresses?.find((addr) => addr.is_default && addr.address_type === "shipping") ?? null;
  const defaultBillingAddress =
    userAddresses?.find((addr) => addr.is_default && addr.address_type === "billing") ?? null;

  // Determine the display addresses based on defaults and types
  const shippingAddress =
    defaultShippingAddress ??
    userAddresses?.find((addr) => addr.address_type === "shipping") ??
    null;
  const billingAddress =
    defaultBillingAddress ?? userAddresses?.find((addr) => addr.address_type === "billing") ?? null;

  // FIX: Construire le nom complet et l'email à partir des données disponibles
  const fullName =
    profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : "";

  const email = user.email || ""; // L'email vient de l'objet user, pas du profil

  return (
    <section className="flex flex-col gap-8">
      {/* Personal Information Section */}
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
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("generalInfo.fullName")}
              </dt>
              <dd className="mt-1 text-base text-foreground">{fullName}</dd>
            </div>
            <div className="sm:col-span-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {t("generalInfo.email")}
              </dt>
              <dd className="mt-1 text-base text-foreground">{email}</dd>
            </div>
          </dl>
        </div>
      </article>

      {/* Addresses Section */}
      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("addresses.title")}</h2>
            <Link
              href={`/${currentLocale}/profile/addresses`}
              className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {tGlobal("manage")}
            </Link>
          </div>
          <AccountDisplayAddress
            address={shippingAddress}
            title={
              profile.billing_address_is_different
                ? t("shippingAddress.title")
                : t("shippingAndBillingAddress.title")
            }
            t={t}
          />
        </div>

        {profile.billing_address_is_different && (
          <>
            <hr className="my-4 border-border" />
            <div className="px-4 py-5 sm:p-6">
              <AccountDisplayAddress
                address={billingAddress}
                title={t("billingAddress.title")}
                t={t}
              />
            </div>
          </>
        )}
      </article>

      {/* Password Section */}
      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("password.sectionTitle")}</h2>
            <Link
              href={`/${currentLocale}/profile/password`}
              className="hover:bg-primary/90 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {tGlobal("edit")}
            </Link>
          </div>
          <p className="text-muted-foreground">{t("password.description")}</p>
        </div>
      </article>

      {/* Orders Section */}
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

      {/* Logout Section */}
      <article className="overflow-hidden border border-border bg-background shadow-md sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">{t("logout.sectionTitle")}</h2>
            <LogoutButton />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{t("logout.description")}</p>
        </div>
      </article>
    </section>
  );
}
