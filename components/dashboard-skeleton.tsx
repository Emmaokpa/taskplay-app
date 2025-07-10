"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* Sidebar Skeleton */}
      <div className="hidden border-r bg-background md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex-1 overflow-auto py-2">
            <nav className="grid items-start gap-2 px-2 text-sm font-medium lg:px-4">
              {[...Array(7)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
      {/* Main Content Skeleton */}
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
          <Skeleton className="h-9 w-9 md:hidden" />
          <div className="flex items-center gap-4 ml-auto">
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-6 p-4 lg:p-6">
          <Skeleton className="h-8 w-1/2 rounded-lg" />
          <Skeleton className="h-48 w-full rounded-xl md:h-64" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}