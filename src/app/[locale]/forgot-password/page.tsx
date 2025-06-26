import { ForgotPasswordForm } from "@/components/domain/auth/forgot-password-form";

export default async function ForgotPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
