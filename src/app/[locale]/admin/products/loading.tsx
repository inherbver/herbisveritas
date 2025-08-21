import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProductsLoading() {
  return (
    <div className="container mx-auto space-y-6 py-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <Skeleton className="mb-2 h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </header>

      {/* Filters and search */}
      <section className="flex flex-wrap items-center gap-4 border-b pb-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
        <div className="ml-auto">
          <Skeleton className="h-10 w-24" />
        </div>
      </section>

      {/* Products table */}
      <main className="rounded-lg border">
        {/* Table header */}
        <div className="border-b p-4">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-1">
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="col-span-2">
              <Skeleton className="h-4 w-18" />
            </div>
          </div>
        </div>

        {/* Table rows */}
        <div className="divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4">
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-1">
                  <Skeleton className="h-16 w-16 rounded" />
                </div>
                <div className="col-span-3 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="col-span-2">
                  <Skeleton className="h-4 w-12" />
                </div>
                <div className="col-span-2 flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Pagination */}
      <footer className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </footer>
    </div>
  );
}
