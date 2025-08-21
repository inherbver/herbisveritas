"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { updateNewsletterPreference } from "../actions";

interface SettingsFormProps {
  initialNewsletterSubscribed: boolean;
}

export function SettingsForm({
  initialNewsletterSubscribed,
}: SettingsFormProps) {
  const t = useTranslations("ProfileSettings");
  const { theme, setTheme } = useTheme();
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(
    initialNewsletterSubscribed,
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleNewsletterToggle = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const result = await updateNewsletterPreference(checked);

      if (result.success) {
        setNewsletterSubscribed(checked);
        toast.success(t("newsletter.updateSuccess"));
      } else {
        toast.error(result.error || t("newsletter.updateError"));
      }
    } catch (error) {
      console.error("Error updating newsletter preference:", error);
      toast.error(t("newsletter.updateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast.success(t("success"));
  };

  return (
    <div className="space-y-6">
      {/* Newsletter Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("newsletter.title")}</CardTitle>
          <CardDescription>{t("newsletter.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="newsletter-toggle" className="text-base">
                {newsletterSubscribed
                  ? t("newsletter.subscribed")
                  : t("newsletter.unsubscribed")}
              </Label>
            </div>
            <Switch
              id="newsletter-toggle"
              checked={newsletterSubscribed}
              onCheckedChange={handleNewsletterToggle}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle>{t("theme.title")}</CardTitle>
          <CardDescription>{t("theme.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme-select" className="text-base">
              {t("theme.title")}
            </Label>
            <Select value={theme} onValueChange={handleThemeChange}>
              <SelectTrigger id="theme-select" className="w-[180px]">
                <SelectValue placeholder={t("theme.system")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("theme.light")}</SelectItem>
                <SelectItem value="dark">{t("theme.dark")}</SelectItem>
                <SelectItem value="system">{t("theme.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
