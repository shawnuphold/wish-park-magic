import { Skeleton } from '@/components/ui/skeleton';

export function ProductSkeleton() {
  return (
    <div className="bg-card rounded-xl overflow-hidden shadow-card">
      {/* Image Skeleton */}
      <div className="relative aspect-square overflow-hidden">
        <Skeleton className="w-full h-full shimmer" />
        
        {/* Badge placeholders */}
        <div className="absolute top-3 left-3">
          <Skeleton className="w-12 h-5 rounded-full" />
        </div>
        <div className="absolute top-3 right-3">
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {[...Array(count)].map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
