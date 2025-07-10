import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export default async function CheckoutSuccessPage() {
  const t = await getTranslations("CheckoutFeedback");

  return (
    <section className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="space-y-4">
        <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {t("successTitle")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("successMessage")}
        </p>
        <Button asChild>
          <Link href="/">{t("backToHome")}</Link>
        </Button>
      </div>
    </section>
  );
}
