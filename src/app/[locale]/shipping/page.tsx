import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Truck, Package, Clock, MapPin } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ShippingPage" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function ShippingPage() {
  const t = useTranslations("ShippingPage");

  const shippingOptions = [
    {
      icon: Truck,
      title: t("options.standard.title"),
      price: t("options.standard.price"),
      duration: t("options.standard.duration"),
      description: t("options.standard.description"),
    },
    {
      icon: Package,
      title: t("options.express.title"),
      price: t("options.express.price"),
      duration: t("options.express.duration"),
      description: t("options.express.description"),
    },
    {
      icon: MapPin,
      title: t("options.pickup.title"),
      price: t("options.pickup.price"),
      duration: t("options.pickup.duration"),
      description: t("options.pickup.description"),
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

      {/* Free shipping banner */}
      <section className="mb-12 rounded-lg border-2 border-primary/20 bg-primary/5 p-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Truck className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-primary">
            {t("freeShipping.title")}
          </h2>
        </div>
        <p className="text-muted-foreground">{t("freeShipping.description")}</p>
      </section>

      {/* Shipping options */}
      <section className="mb-12">
        <h2 className="mb-8 text-3xl font-bold text-center">
          {t("optionsTitle")}
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {shippingOptions.map((option, index) => (
            <div key={index} className="rounded-lg border p-6 text-center">
              <option.icon className="mx-auto mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-xl font-semibold">{option.title}</h3>
              <p className="mb-2 text-2xl font-bold text-primary">
                {option.price}
              </p>
              <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{option.duration}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {option.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Processing times */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">{t("processing.title")}</h2>
        <div className="rounded-lg border p-6">
          <p className="mb-4">{t("processing.description")}</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>• {t("processing.times.0")}</li>
            <li>• {t("processing.times.1")}</li>
            <li>• {t("processing.times.2")}</li>
          </ul>
        </div>
      </section>

      {/* International shipping */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">
          {t("international.title")}
        </h2>
        <div className="rounded-lg border p-6">
          <p className="mb-4">{t("international.description")}</p>
          <p className="text-muted-foreground">{t("international.note")}</p>
        </div>
      </section>

      {/* Tracking */}
      <section className="mb-12">
        <h2 className="mb-6 text-2xl font-semibold">{t("tracking.title")}</h2>
        <div className="rounded-lg border p-6">
          <p className="mb-4">{t("tracking.description")}</p>
          <p className="text-muted-foreground">{t("tracking.howTo")}</p>
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
