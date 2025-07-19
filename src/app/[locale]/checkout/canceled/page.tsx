import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default async function CheckoutCanceledPage() {
  const t = await getTranslations("CheckoutFeedback");

  return (
    <section className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="space-y-4">
        <XCircle className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("canceledTitle")}</h1>
        <p className="text-lg text-muted-foreground">{t("canceledMessage")}</p>
        <Button asChild variant="outline">
          <Link href="/checkout">{t("tryAgain")}</Link>
        </Button>
      </div>
    </section>
  );
}
