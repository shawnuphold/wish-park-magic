"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { RESORTS } from '@/lib/park-shopping-config';
import { ChevronRight, ShoppingBag } from 'lucide-react';

interface ResortCounts {
  [key: string]: {
    total: number;
    parks: { [key: string]: number };
  };
}

export default function ParkShoppingPage() {
  const [counts, setCounts] = useState<ResortCounts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShoppingBag className="w-8 h-8 text-gold" />
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Park Shopping</h1>
          <p className="text-sm text-muted-foreground">Select a resort to view pending requests</p>
        </div>
      </div>

      {/* Resort cards */}
      <div className="grid gap-4">
        {Object.entries(RESORTS).map(([resortKey, resort]) => {
          const resortCount = counts?.[resortKey]?.total || 0;

          // For SeaWorld (single park), link directly to the park page
          const href = resortKey === 'seaworld'
            ? `/admin/park-shopping/seaworld/seaworld`
            : `/admin/park-shopping/${resortKey}`;

          return (
            <Link key={resortKey} href={href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{resort.emoji}</span>
                      <div>
                        <h2 className="text-xl font-semibold text-foreground">
                          {resort.name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {resortCount === 0 ? (
                            'No pending requests'
                          ) : (
                            <>
                              <span className="font-medium text-gold">{resortCount}</span>
                              {' pending request'}{resortCount !== 1 ? 's' : ''}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Empty state */}
      {counts && Object.values(counts).every(r => r.total === 0) && (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No pending shopping requests</p>
          <p className="text-sm">New requests will appear here when customers submit them.</p>
        </div>
      )}
    </div>
  );
}
