'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Park {
  code: string;
  name: string;
  icon: string;
  parent: string;
  pendingCount: number;
}

export function ParkSelector() {
  const [parks, setParks] = useState<Park[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchParks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch('/api/shopping/parks');
      if (response.ok) {
        const data = await response.json();
        setParks(data.parks || []);
      }
    } catch (error) {
      console.error('Error fetching parks:', error);
      toast.error('Failed to load parks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchParks();
  }, []);

  // Group parks by parent
  const disneyParks = parks.filter(p => p.parent === 'disney');
  const universalParks = parks.filter(p => p.parent === 'universal');
  const otherParks = parks.filter(p => p.parent === 'seaworld');

  const totalPending = parks.reduce((sum, p) => sum + p.pendingCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Shop Now</h1>
          <p className="text-muted-foreground">
            {totalPending > 0 ? `${totalPending} items waiting` : 'No pending items'}
          </p>
        </div>
        <button
          onClick={() => fetchParks(true)}
          disabled={refreshing}
          className="p-2 rounded-lg hover:bg-muted transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Disney Parks */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Disney World
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {disneyParks.map(park => (
            <ParkCard key={park.code} park={park} />
          ))}
        </div>
      </div>

      {/* Universal Parks */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Universal Orlando
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {universalParks.map(park => (
            <ParkCard key={park.code} park={park} />
          ))}
        </div>
      </div>

      {/* Other Parks */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wide">
          Other Parks
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {otherParks.map(park => (
            <ParkCard key={park.code} park={park} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ParkCard({ park }: { park: Park }) {
  const hasItems = park.pendingCount > 0;

  return (
    <Link
      href={`/admin/shopping-trips/${park.code}`}
      className={`
        block p-4 rounded-xl border transition-all
        ${hasItems
          ? 'bg-card border-border hover:border-gold hover:shadow-md'
          : 'bg-muted/30 border-transparent opacity-60'
        }
      `}
    >
      <div className="text-center">
        <div className="text-3xl mb-2">{park.icon}</div>
        <div className="font-medium text-sm leading-tight">{park.name}</div>
        <div className={`text-xs mt-1 ${hasItems ? 'text-gold font-medium' : 'text-muted-foreground'}`}>
          {park.pendingCount} {park.pendingCount === 1 ? 'item' : 'items'}
        </div>
      </div>
    </Link>
  );
}
