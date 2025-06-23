// 1. src/app/[locale]/(checkout)/checkout/success/page.tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface CheckoutSuccessPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export async function generateMetadata({ params }: CheckoutSuccessPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CheckoutSuccessPage" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function CheckoutSuccessPage({
  params: _params,
  searchParams,
}: CheckoutSuccessPageProps) {
  const { session_id } = await searchParams;
  const t = await getTranslations("CheckoutSuccessPage");

  return (
    <main className="container mx-auto my-12">
      <article className="flex flex-col items-center justify-center text-center">
        {/* Success Icon */}
        <figure className="mb-4" aria-label={t("successIconLabel")}>
          <CheckCircle className="h-16 w-16 text-green-500" aria-hidden="true" />
        </figure>

        {/* Page Header */}
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
            {t("header")}
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300">{t("message")}</p>
        </header>

        {/* Order Details Section */}
        {session_id && (
          <section className="mt-4" aria-labelledby="order-details-heading">
            <h2 id="order-details-heading" className="sr-only">
              {t("orderDetailsHeading")}
            </h2>
            <address className="not-italic">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t("orderReference")}:
                <strong className="ml-1 font-mono">{session_id.slice(-8).toUpperCase()}</strong>
              </span>
            </address>
          </section>
        )}

        {/* Call to Action Navigation */}
        <nav className="mt-8" aria-label={t("navigationLabel")}>
          <menu className="m-0 flex list-none items-center gap-4 p-0">
            <li>
              <Button asChild>
                <Link href="/profile/orders">{t("viewOrdersButton")}</Link>
              </Button>
            </li>
            <li>
              <Button variant="outline" asChild>
                <Link href="/">{t("continueShoppingButton")}</Link>
              </Button>
            </li>
          </menu>
        </nav>

        {/* Additional Information */}
        <aside className="mt-8 max-w-md">
          <details className="text-sm text-gray-600 dark:text-gray-400">
            <summary className="cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
              {t("whatHappensNextSummary")}
            </summary>
            <section className="mt-2 space-y-2 text-left">
              <p>{t("confirmationEmailInfo")}</p>
              <p>{t("processingTimeInfo")}</p>
              <p>{t("trackingInfo")}</p>
            </section>
          </details>
        </aside>
      </article>
    </main>
  );
}
