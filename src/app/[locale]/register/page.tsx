import { RegisterForm } from "@/components/forms/register-form";

export default function RegisterPage() {
  return (
    <div className="bg-muted/40 flex min-h-[calc(100vh-theme(spacing.16))] flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <RegisterForm />
    </div>
  );
}
