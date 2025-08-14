import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Shield, Edit, User } from "lucide-react";

interface UserRoleBadgeProps {
  role: string;
  showIcon?: boolean;
  className?: string;
}

export function UserRoleBadge({ role, showIcon = false, className }: UserRoleBadgeProps) {
  const getRoleConfig = (role: string) => {
    switch (role) {
      case "admin":
        return {
          label: "Admin",
          icon: Shield,
          className: "bg-red-100 text-red-800 border-red-200 hover:bg-red-200",
        };
      case "editor":
        return {
          label: "Éditeur",
          icon: Edit,
          className: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200",
        };
      case "dev":
        return {
          label: "Développeur",
          icon: Shield,
          className: "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200",
        };
      case "user":
      default:
        return {
          label: "Utilisateur",
          icon: User,
          className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200",
        };
    }
  };

  const config = getRoleConfig(role || "user");
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", config.className, showIcon && "gap-1", className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
