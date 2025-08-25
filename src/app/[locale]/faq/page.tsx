import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "FAQPage" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function FAQPage() {
  const t = useTranslations("FAQPage");

  const faqCategories = [
    {
      title: t("categories.orders.title"),
      questions: Array.from({ length: 4 }, (_, i) => ({
        question: t(`categories.orders.questions.${i}.question`),
        answer: t(`categories.orders.questions.${i}.answer`),
      })),
    },
    {
      title: t("categories.shipping.title"),
      questions: Array.from({ length: 3 }, (_, i) => ({
        question: t(`categories.shipping.questions.${i}.question`),
        answer: t(`categories.shipping.questions.${i}.answer`),
      })),
    },
    {
      title: t("categories.products.title"),
      questions: Array.from({ length: 3 }, (_, i) => ({
        question: t(`categories.products.questions.${i}.question`),
        answer: t(`categories.products.questions.${i}.answer`),
      })),
    },
    {
      title: t("categories.account.title"),
      questions: Array.from({ length: 2 }, (_, i) => ({
        question: t(`categories.account.questions.${i}.question`),
        answer: t(`categories.account.questions.${i}.answer`),
      })),
    },
  ];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
          {t("title")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("subtitle")}</p>
      </header>

      <main className="space-y-8">
        {faqCategories.map((category, categoryIndex) => (
          <section key={categoryIndex} className="space-y-4">
            <h2 className="text-2xl font-semibold">{category.title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {category.questions.map((faq, questionIndex) => (
                <AccordionItem
                  key={questionIndex}
                  value={`${categoryIndex}-${questionIndex}`}
                >
                  <AccordionTrigger className="text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        ))}

        <section className="mt-12 rounded-lg border bg-muted/50 p-8 text-center">
          <h2 className="mb-4 text-xl font-semibold">{t("contact.title")}</h2>
          <p className="mb-4 text-muted-foreground">
            {t("contact.description")}
          </p>
          <Button asChild variant="support">
            <a href="mailto:contact@inherbisveritas.fr">
              {t("contact.button")}
            </a>
          </Button>
        </section>
      </main>
    </div>
  );
}
