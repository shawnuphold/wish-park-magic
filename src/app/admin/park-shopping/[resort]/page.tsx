"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RESORTS, getAllLocations } from '@/lib/park-shopping-config';
import { ChevronLeft } from 'lucide-react';

interface ResortCounts {
  [key: string]: {
    total: number;
    parks: { [key: string]: number };
  };
}

export default function ResortLocationSelectorPage() {
  const params = useParams();
  const resort = params.resort as string;
  const router = useRouter();
  const [counts, setCounts] = useState<ResortCounts | null>(null);
  const [loading, setLoading] = useState(true);

  const resortConfig = RESORTS[resort];

  useEffect(() => {
    // Redirect if invalid resort
    if (!resortConfig) {
      router.push('/admin/park-shopping');
      return;
    }

    // Get all locations count
    const allLocations = getAllLocations(resort);

    // If single location resort, redirect directly to location page
    if (allLocations.length === 1) {
      router.push(`/admin/park-shopping/${resort}/${allLocations[0].id}`);
      return;
    }

    async function fetchCounts() {
      try {
        const res = await fetch('/api/park-shopping/counts');
        if (res.ok) {
          const data = await res.json();
          setCounts(data);
        }
      } catch (error) {
        console.error('Error fetching counts:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCounts();
  }, [resort, resortConfig, router]);

  if (!resortConfig) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  const resortCounts = counts?.[resort];
  const totalRequests = resortCounts?.total || 0;
  const allLocations = getAllLocations(resort);
  const locationCount = allLocations.length;

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/admin/park-shopping')}
          className="h-10 w-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="h-10 flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={resortConfig.logo}
              alt={resortConfig.name}
              className="h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).classList.remove('hidden');
                }
              }}
            />
            <span className="text-3xl hidden">{resortConfig.emoji}</span>
          </div>
          <div>
            <h1 className="text-xl font-heading font-bold text-foreground">
              {resortConfig.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalRequests === 0 ? (
                `${locationCount} locations • No pending requests`
              ) : (
                <>
                  <span className="font-medium text-gold">{totalRequests}</span>
                  {' pending request'}{totalRequests !== 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Categories with location cards */}
      {resortConfig.categories.map((category) => (
        <div key={category.name} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {category.name}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {category.locations.map((location) => {
              const locationCount = resortCounts?.parks[location.dbValue] || 0;

              return (
                <Link
                  key={location.id}
                  href={`/admin/park-shopping/${resort}/${location.id}`}
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-3 flex flex-col items-center text-center">
                      <div className="w-full h-10 mb-2 flex items-center justify-center">
                        {location.logo ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={location.logo}
                              alt={location.name}
                              className="max-w-full max-h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextElementSibling) {
                                  (e.currentTarget.nextElementSibling as HTMLElement).classList.remove('hidden');
                                }
                              }}
                            />
                            <span className="text-3xl hidden">{location.emoji}</span>
                          </>
                        ) : (
                          <span className="text-3xl">{location.emoji}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-foreground text-xs leading-tight line-clamp-2">
                        {location.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {locationCount === 0 ? (
                          <span className="opacity-50">0</span>
                        ) : (
                          <span className="font-medium text-gold">{locationCount}</span>
                        )}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {totalRequests === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No pending shopping requests for {resortConfig.name}</p>
        </div>
      )}
    </div>
  );
}
