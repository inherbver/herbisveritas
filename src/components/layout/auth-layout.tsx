import React from "react";
import { Logo } from "@/components/primitives/logo"; // Optional: Add logo
import Link from "next/link";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-serif text-xl font-bold text-primary"
            legacyBehavior
          >
            <Logo className="h-12 w-auto" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
};

export { AuthLayout };
