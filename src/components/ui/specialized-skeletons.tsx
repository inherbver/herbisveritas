import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";

// Product Card Skeleton
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="aspect-square w-full rounded-2xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Magazine Article Card Skeleton
export function ArticleCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <Skeleton className="aspect-[16/9] w-full rounded-lg" />
      <div className="space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

// User Profile Card Skeleton
export function UserCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 p-4", className)}>
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

// Data Table Row Skeleton
export function TableRowSkeleton({
  columns = 5,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("grid gap-4 p-4", className)}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

// Form Field Skeleton
export function FormFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

// Stats Card Skeleton
export function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border p-6", className)}>
      <div className="flex items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// Navigation Menu Skeleton
export function NavMenuSkeleton({
  items = 4,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <nav className={cn("space-y-2", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </nav>
  );
}

// Button Skeleton
export function ButtonSkeleton({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizeClasses = {
    sm: "h-8 w-20",
    default: "h-10 w-24",
    lg: "h-12 w-32",
  };

  return <Skeleton className={cn(sizeClasses[size], className)} />;
}

// Page Header Skeleton
export function PageHeaderSkeleton({
  showBreadcrumb = true,
  showActions = true,
  className,
}: {
  showBreadcrumb?: boolean;
  showActions?: boolean;
  className?: string;
}) {
  return (
    <header className={cn("flex items-center justify-between", className)}>
      <div className="space-y-2">
        {showBreadcrumb && <Skeleton className="h-4 w-32" />}
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      {showActions && (
        <div className="flex gap-2">
          <ButtonSkeleton />
          <ButtonSkeleton size="sm" />
        </div>
      )}
    </header>
  );
}

// Grid Layout Skeleton
export function GridSkeleton({
  items = 12,
  columns = "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  renderItem,
  className,
}: {
  items?: number;
  columns?: string;
  renderItem?: (index: number) => React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(`grid gap-6 ${columns}`, className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i}>
          {renderItem ? renderItem(i) : <ProductCardSkeleton />}
        </div>
      ))}
    </div>
  );
}

// Full Page Loading Layout
export function FullPageSkeleton({
  showHeader = true,
  showSidebar = false,
  showFooter = false,
  className,
}: {
  showHeader?: boolean;
  showSidebar?: boolean;
  showFooter?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen", className)}>
      {showHeader && (
        <header className="border-b p-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
          </div>
        </header>
      )}

      <div
        className={cn(
          "container mx-auto p-4",
          showSidebar && "grid lg:grid-cols-4 gap-8",
        )}
      >
        {showSidebar && (
          <aside className="lg:col-span-1">
            <NavMenuSkeleton />
          </aside>
        )}

        <main className={cn("space-y-8", showSidebar && "lg:col-span-3")}>
          <PageHeaderSkeleton />
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-6">
                <Skeleton className="mb-4 h-6 w-40" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>

      {showFooter && (
        <footer className="border-t p-4">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8" />
                ))}
              </div>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
