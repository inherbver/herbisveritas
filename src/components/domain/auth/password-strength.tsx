"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";

export const PasswordRequirement = ({ label, met }: { label: string; met: boolean }) => (
  <div className="flex items-center text-sm">
    {met ? (
      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="mr-2 h-4 w-4 text-destructive" />
    )}
    <span>{label}</span>
  </div>
);

export const PasswordStrengthBar = ({ strength }: { strength: number }) => {
  const tStrength = useTranslations("PasswordPage.strengthIndicator");
  const strengthColors = [
    "bg-destructive",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
    "bg-green-500",
  ];
  const strengthLabelKeys = ["veryWeak", "weak", "medium", "strong", "veryStrong"];

  const color = strengthColors[strength] || "bg-gray-200";
  const currentStrengthKey = strengthLabelKeys[strength] || strengthLabelKeys[0];
  const translatedLabelText = tStrength(currentStrengthKey);

  return (
    <div className="mt-1">
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-300 ease-in-out`}
          style={{ width: `${((strength + 1) / 5) * 100}%` }}
        />
      </div>
      {translatedLabelText && (
        <p className="mt-1 text-xs text-muted-foreground">
          {tStrength("label")} {translatedLabelText}
        </p>
      )}
    </div>
  );
};
