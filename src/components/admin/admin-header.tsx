import { ReactNode } from "react";
import { MobileSidebar } from "./mobile-sidebar";

interface AdminHeaderProps {
  title: string;
  description?: string;
  headerAction?: ReactNode;
}

export function AdminHeader({ title, description, headerAction }: AdminHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        <MobileSidebar />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div>{headerAction}</div>
    </header>
  );
}
