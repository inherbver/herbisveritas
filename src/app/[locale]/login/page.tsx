import { LoginForm } from "@/components/domain/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-theme(spacing.16))] flex-1 flex-col items-center justify-center px-6 py-12 lg:px-8">
      <LoginForm />
    </div>
  );
}
