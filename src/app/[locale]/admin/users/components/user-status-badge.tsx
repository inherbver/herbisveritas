import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface UserStatusBadgeProps {
  status: string;
  className?: string;
}

export function UserStatusBadge({ status, className }: UserStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active":
        return {
          label: "Actif",
          variant: "default" as const,
          className: "bg-green-100 text-green-800 hover:bg-green-200",
        };
      case "suspended":
        return {
          label: "Suspendu",
          variant: "destructive" as const,
          className: "bg-red-100 text-red-800 hover:bg-red-200",
        };
      case "inactive":
        return {
          label: "Inactif",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-800 hover:bg-gray-200",
        };
      default:
        return {
          label: "Actif",
          variant: "default" as const,
          className: "bg-green-100 text-green-800 hover:bg-green-200",
        };
    }
  };

  const config = getStatusConfig(status || "active");

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
