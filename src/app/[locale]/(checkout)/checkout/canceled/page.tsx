// 2. src/app/[locale]/(checkout)/checkout/canceled/page.tsx
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { XCircle, AlertTriangle } from "lucide-react";

interface CheckoutCanceledPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export async function generateMetadata({ params }: CheckoutCanceledPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CheckoutCanceledPage" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function CheckoutCanceledPage({
  params: _params,
  searchParams,
}: CheckoutCanceledPageProps) {
  const { reason } = await searchParams;
  const t = await getTranslations("CheckoutCanceledPage");

  return (
    <main className="container mx-auto my-12">
      <article className="flex flex-col items-center justify-center text-center">
        {/* Error Icon */}
        <figure className="mb-4" aria-label={t("errorIconLabel")}>
          <XCircle className="h-16 w-16 text-red-500" aria-hidden="true" />
        </figure>

        {/* Page Header */}
        <header className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
            {t("header")}
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-300">{t("message")}</p>
        </header>

        {/* Cancellation Reason Section */}
        {reason && (
          <section className="mt-4" aria-labelledby="cancellation-reason-heading">
            <h2 id="cancellation-reason-heading" className="sr-only">
              {t("cancellationReasonHeading")}
            </h2>
            <aside className="inline-flex items-center gap-2 rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <span>
                <strong>{t("reason")}:</strong> {reason}
              </span>
            </aside>
          </section>
        )}

        {/* Call to Action Navigation */}
        <nav className="mt-8" aria-label={t("navigationLabel")}>
          <menu className="m-0 flex list-none items-center gap-4 p-0">
            <li>
              <Button asChild>
                <Link href="/cart">{t("backToCartButton")}</Link>
              </Button>
            </li>
            <li>
              <Button variant="outline" asChild>
                <Link href="/">{t("continueShoppingButton")}</Link>
              </Button>
            </li>
          </menu>
        </nav>

        {/* Help and Support Section */}
        <aside className="mt-8 max-w-md">
          <section className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <header>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                {t("needHelpHeading")}
              </h2>
            </header>
            <address className="mt-2 space-y-2 text-sm not-italic text-gray-600 dark:text-gray-400">
              <p>{t("supportMessage")}</p>
              <p>
                <strong>{t("supportEmailLabel")}:</strong>{" "}
                <a href="mailto:support@herbisveritas.com" className="text-primary hover:underline">
                  support@herbisveritas.com
                </a>
              </p>
              <p>
                <strong>{t("supportPhoneLabel")}:</strong>{" "}
                <a href="tel:+33123456789" className="text-primary hover:underline">
                  +33 1 23 45 67 89
                </a>
              </p>
            </address>
          </section>
        </aside>
      </article>
    </main>
  );
}
