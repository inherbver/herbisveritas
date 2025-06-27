import { ReactNode } from 'react';
import { MobileSidebar } from './mobile-sidebar';

interface AdminHeaderProps {
  title: string;
  headerAction?: ReactNode;
}

export function AdminHeader({ title, headerAction }: AdminHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6">
      <div className="flex items-center gap-4">
        <MobileSidebar />
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      <div>{headerAction}</div>
    </header>
  );
}
