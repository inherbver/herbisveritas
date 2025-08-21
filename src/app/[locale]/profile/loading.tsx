import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="container mx-auto max-w-4xl space-y-8 py-8">
      {/* Header */}
      <header className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </header>

      {/* Profile content */}
      <div className="grid gap-8 lg:grid-cols-4">
        {/* Sidebar navigation */}
        <aside className="space-y-2 lg:col-span-1">
          <Skeleton className="mb-4 h-6 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </aside>

        {/* Main content */}
        <main className="space-y-6 lg:col-span-3">
          {/* Profile form */}
          <section className="rounded-lg border p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <Skeleton className="mb-2 h-6 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-24" />
            </div>

            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-28" />
            </div>
          </section>

          {/* Additional sections */}
          <section className="rounded-lg border p-6">
            <Skeleton className="mb-4 h-6 w-36" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div>
                      <Skeleton className="mb-1 h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
