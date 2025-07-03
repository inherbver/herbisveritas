import { formatPrice } from "@/utils/formatters";
import { Locale } from "@/i18n-config";

interface PriceProps {
  value: number | null | undefined;
  locale: Locale;
  className?: string;
}

export const Price = ({ value, locale, className }: PriceProps) => {
  const formatted = formatPrice(value, locale);

  return <span className={className}>{formatted}</span>;
};
