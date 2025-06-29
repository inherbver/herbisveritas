import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export default function UnauthorizedPage() {
  const t = useTranslations("Unauthorized");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
      <article className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-xl dark:bg-gray-800">
        <header>
          <h1 className="text-4xl font-bold text-red-600 dark:text-red-500">{t("title")}</h1>
        </header>
        <section className="mt-4">
          <p className="text-lg text-gray-700 dark:text-gray-300">{t("message")}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t("contactAdmin")}</p>
        </section>
        <footer className="mt-8">
          <Link
            href="/"
            className="rounded-md bg-blue-600 px-6 py-2 text-white transition-colors hover:bg-blue-700"
          >
            {t("backToHome")}
          </Link>
        </footer>
      </article>
    </main>
  );
}
