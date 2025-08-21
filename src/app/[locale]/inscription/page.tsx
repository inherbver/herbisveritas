import { redirect } from "next/navigation";

interface InscriptionPageProps {
  params: Promise<{ locale: string }>;
}

export default async function InscriptionPage({
  params,
}: InscriptionPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/register`);
}
