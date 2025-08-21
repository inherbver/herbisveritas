import { redirect } from "next/navigation";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/login`);
}
