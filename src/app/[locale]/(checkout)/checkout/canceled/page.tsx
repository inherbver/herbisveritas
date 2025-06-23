import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: "CheckoutCanceledPage" });
  return {
    title: t("title"),
  };
}

export default async function CheckoutCanceledPage() {
  const t = await getTranslations("CheckoutCanceledPage");

  return (
    <div className="container mx-auto my-12 flex flex-col items-center justify-center text-center">
      <XCircle className="h-16 w-16 text-red-500" />
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl dark:text-gray-50">
        {t("header")}
      </h1>
      <p className="mt-4 text-base text-gray-600 dark:text-gray-300">{t("message")}</p>
      <div className="mt-8 flex items-center gap-4">
        <Button asChild>
          <Link href="/cart">{t("backToCartButton")}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{t("continueShoppingButton")}</Link>
        </Button>
      </div>
    </div>
  );
}
