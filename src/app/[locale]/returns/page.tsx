import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { RotateCcw, Clock, CheckCircle, AlertCircle } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ReturnsPage" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ReturnsPage() {
  const t = useTranslations("ReturnsPage");

  const returnSteps = [
    {
      icon: AlertCircle,
      title: t("steps.0.title"),
      description: t("steps.0.description"),
    },
    {
      icon: RotateCcw,
      title: t("steps.1.title"),
      description: t("steps.1.description"),
    },
    {
      icon: CheckCircle,
      title: t("steps.2.title"),
      description: t("steps.2.description"),
    },
  ];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* Return policy summary */}
      <section className="mb-12 rounded-lg border bg-primary/5 p-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Clock className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-semibold text-primary">
            {t("policy.title")}
          </h2>
        </div>
        <p className="text-lg text-muted-foreground">
          {t("policy.description")}
        </p>
      </section>

      {/* Return process steps */}
      <section className="mb-12">
        <h2 className="mb-8 text-3xl font-bold text-center">
          {t("processTitle")}
        </h2>
        <div className="grid gap-8 md:grid-cols-3">
          {returnSteps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-4 text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Conditions */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">{t("conditions.title")}</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-green-600">
              <CheckCircle className="h-5 w-5" />
              {t("conditions.accepted.title")}
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• {t("conditions.accepted.items.0")}</li>
              <li>• {t("conditions.accepted.items.1")}</li>
              <li>• {t("conditions.accepted.items.2")}</li>
            </ul>
          </div>
          <div className="rounded-lg border p-6">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-600">
              <AlertCircle className="h-5 w-5" />
              {t("conditions.rejected.title")}
            </h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• {t("conditions.rejected.items.0")}</li>
              <li>• {t("conditions.rejected.items.1")}</li>
              <li>• {t("conditions.rejected.items.2")}</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Return shipping */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">{t("shipping.title")}</h2>
        <div className="rounded-lg border p-6">
          <p className="mb-4">{t("shipping.description")}</p>
          <div className="rounded-md bg-muted/50 p-4">
            <p className="font-medium">{t("shipping.address.title")}</p>
            <address className="mt-2 text-muted-foreground not-italic">
              In Herbis Veritas
              <br />
              Service Retours
              <br />
              [Adresse de retour]
              <br />
              [Code postal] [Ville]
              <br />
              France
            </address>
          </div>
        </div>
      </section>

      {/* Refund information */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">{t("refund.title")}</h2>
        <div className="rounded-lg border p-6">
          <p className="mb-4">{t("refund.description")}</p>
          <p className="text-muted-foreground">{t("refund.timeframe")}</p>
        </div>
      </section>

      {/* Contact section */}
      <section className="rounded-lg border bg-muted/50 p-8 text-center">
        <h2 className="mb-4 text-xl font-semibold">{t("contact.title")}</h2>
        <p className="mb-4 text-muted-foreground">{t("contact.description")}</p>
        <a
          href="mailto:contact@inherbisveritas.fr"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("contact.button")}
        </a>
      </section>
    </div>
  );
}
