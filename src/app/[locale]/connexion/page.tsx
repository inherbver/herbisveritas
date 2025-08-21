import { redirect } from "next/navigation";

interface ConnexionPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ConnexionPage({ params }: ConnexionPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}
