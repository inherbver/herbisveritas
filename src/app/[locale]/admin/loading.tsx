import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="container mx-auto space-y-6 py-8">
      {/* Header with breadcrumb */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-6 w-16" />
          <div>
            <Skeleton className="mb-2 h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </header>

      {/* Stats cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </section>

      {/* Main content area */}
      <main className="space-y-6">
        <div className="rounded-lg border">
          <div className="border-b p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
