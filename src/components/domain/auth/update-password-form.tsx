"use client";

import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { useActionState, useEffect, useState } from "react";
import Link from "next/link";

import { updatePasswordAction } from "@/actions/authActions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  PasswordRequirement,
  PasswordStrengthBar,
} from "@/components/domain/auth/password-strength";

// Constants for password validation
const MIN_LENGTH = 8;
const REGEX_UPPERCASE = /[A-Z]/;
const REGEX_NUMBER = /[0-9]/;
const REGEX_SPECIAL_CHAR = /[^A-Za-z0-9]/;

function SubmitButton({ text, loadingText }: { text: string; loadingText: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? loadingText : text}
    </Button>
  );
}

export function UpdatePasswordForm() {
  const t = useTranslations("Auth.UpdatePassword");
  const tGlobal = useTranslations("Global");
  const locale = useLocale();
  const [state, formAction] = useActionState(updatePasswordAction, undefined);

  const [password, setPassword] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    const newRequirements = {
      length: (password || "").length >= MIN_LENGTH,
      uppercase: REGEX_UPPERCASE.test(password || ""),
      number: REGEX_NUMBER.test(password || ""),
      specialChar: REGEX_SPECIAL_CHAR.test(password || ""),
    };
    setRequirements(newRequirements);

    const strength = Object.values(newRequirements).filter(Boolean).length;
    setPasswordStrength(strength);
  }, [password]);

  if (state?.success) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-green-700">{t("successMessage")}</h2>
        <Link
          href="/login"
          className="bg-p-olive-dark hover:bg-p-olive-dark/90 focus:ring-p-olive-dark mt-4 inline-block rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2"
        >
          {t("loginLink")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-center text-3xl font-extrabold text-gray-900">{t("title")}</h2>
      <p className="mt-2 text-center text-sm text-gray-600">{t("description")}</p>
      <form action={formAction} className="mt-8 space-y-6">
        <input type="hidden" name="locale" value={locale} />
        <div className="space-y-4">
          <div>
            <Label htmlFor="password">{t("passwordLabel")}</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {state?.fieldErrors?.password && (
              <p className="mt-2 text-sm text-red-600">{state.fieldErrors.password.join(", ")}</p>
            )}
          </div>
          <PasswordStrengthBar strength={passwordStrength} />
          <div className="mt-4 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <PasswordRequirement
              met={requirements.length}
              label={t("validation.minLength", { count: MIN_LENGTH })}
            />
            <PasswordRequirement
              met={requirements.uppercase}
              label={t("validation.oneUppercase")}
            />
            <PasswordRequirement met={requirements.number} label={t("validation.oneNumber")} />
            <PasswordRequirement
              met={requirements.specialChar}
              label={t("validation.oneSpecialChar")}
            />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t("confirmPasswordLabel")}</Label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              autoComplete="new-password"
            />
            {state?.fieldErrors?.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">
                {state.fieldErrors.confirmPassword.join(", ")}
              </p>
            )}
          </div>
        </div>

        {state?.error && <p className="mt-4 text-center text-sm text-red-600">{state.error}</p>}

        <div>
          <SubmitButton text={t("submitButton")} loadingText={tGlobal("loading")} />
        </div>
      </form>
    </div>
  );
}
