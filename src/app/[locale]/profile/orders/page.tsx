import { getTranslations } from "next-intl/server";
import { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface OrdersPageProps {
  params: Promise<{ locale: string }>; // Changé: params est maintenant une Promise
}

export async function generateMetadata({ params }: OrdersPageProps): Promise<Metadata> {
  const { locale } = await params; // Await params ici
  const t = await getTranslations({ locale, namespace: "OrdersPage.metadata" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { locale } = await params; // Await params ici
  const t = await getTranslations({ locale, namespace: "OrdersPage" });
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/profile/orders`);
  }

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      `
      id,
      created_at,
      total_amount,
      currency,
      status,
      order_items (
        id,
        quantity,
        price_at_purchase,
        product_name_at_purchase,
        product_image_url_at_purchase
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    // Idéalement, afficher un composant d'erreur ici
  }

  return (
    <main className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
      </header>

      {orders && orders.length > 0 ? (
        <section className="space-y-10" aria-label={t("ordersHistory")}>
          {orders.map((order) => (
            <article key={order.id} className="rounded-lg border bg-card shadow-sm">
              <header className="flex flex-wrap items-center justify-between gap-4 border-b p-4 md:p-6">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  <figure>
                    <dt className="font-semibold text-muted-foreground">{t("orderDate")}</dt>
                    <dd className="text-foreground">
                      <time dateTime={order.created_at}>
                        {new Date(order.created_at).toLocaleDateString(locale, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </dd>
                  </figure>
                  <figure>
                    <dt className="font-semibold text-muted-foreground">{t("total")}</dt>
                    <dd className="font-medium text-foreground">
                      <data value={order.total_amount}>
                        {new Intl.NumberFormat(locale, {
                          style: "currency",
                          currency: order.currency || "EUR",
                        }).format(order.total_amount)}
                      </data>
                    </dd>
                  </figure>
                  <figure>
                    <dt className="font-semibold text-muted-foreground">{t("orderId")}</dt>
                    <dd className="font-mono text-foreground">
                      <code>{order.id.split("-")[0]}</code>
                    </dd>
                  </figure>
                </dl>
                <Badge
                  variant="outline"
                  className="capitalize"
                  role="status"
                  aria-label={`${t("status")}: ${t(`statusValues.${order.status}`)}`}
                >
                  {t(`statusValues.${order.status}`)}
                </Badge>
              </header>

              <section aria-label={t("orderItems")}>
                <h3 className="sr-only">{t("itemsList")}</h3>
                <ul className="divide-y" role="list">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex items-start gap-4 p-4 md:p-6">
                      <figure className="flex-shrink-0">
                        <Image
                          src={item.product_image_url_at_purchase || "/images/placeholder.svg"}
                          alt={item.product_name_at_purchase || "Produit"}
                          width={80}
                          height={80}
                          className="aspect-square rounded-md object-cover"
                        />
                      </figure>
                      <section className="flex-grow">
                        <h4 className="font-semibold text-foreground">
                          {item.product_name_at_purchase}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          <span className="sr-only">{t("itemQuantity")}: </span>
                          <data value={item.quantity}>
                            {t("itemQuantity")}: {item.quantity}
                          </data>
                        </p>
                      </section>
                      <aside className="text-sm font-medium text-foreground">
                        <data value={item.price_at_purchase}>
                          {new Intl.NumberFormat(locale, {
                            style: "currency",
                            currency: order.currency || "EUR",
                          }).format(item.price_at_purchase)}
                        </data>
                      </aside>
                    </li>
                  ))}
                </ul>
              </section>
            </article>
          ))}
        </section>
      ) : (
        <section
          className="rounded-lg border border-dashed p-8 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-lg font-medium text-muted-foreground">{t("noOrders")}</p>
          {/* Ajout pour débugger */}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Debug info</summary>
              <pre className="mt-2 text-xs text-gray-400">
                {JSON.stringify(
                  {
                    userId: user?.id,
                    ordersCount: orders?.length,
                    error: error?.message,
                  },
                  null,
                  2
                )}
              </pre>
            </details>
          )}
        </section>
      )}
    </main>
  );
}
