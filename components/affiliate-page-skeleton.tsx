"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

function SkeletonCard() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <Skeleton className="relative w-full h-48" />
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-1/2 mt-1" />
      </CardHeader>
      <CardContent className="flex-grow pt-2 space-y-2">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-5 w-2/3" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

export function AffiliatePageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <Skeleton className="h-12 w-1/2 mx-auto" />
        <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
        <Skeleton className="h-6 w-1/3 mx-auto mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}