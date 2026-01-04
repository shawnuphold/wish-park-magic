'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StoreSection } from './StoreSection';
import type { ShoppingItem } from './ShoppingItemCard';

interface Store {
  storeName: string;
  landName: string | null;
  items: ShoppingItem[];
  pendingCount: number;
  foundCount: number;
  notFoundCount: number;
}

interface ShoppingListProps {
  parkCode: string;
}

export function ShoppingList({ parkCode }: ShoppingListProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parkName, setParkName] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, found: 0, notFound: 0, totalSpent: 0 });
  const [filter, setFilter] = useState('all');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch(`/api/shopping/${parkCode}`);
      if (response.ok) {
        const data = await response.json();
        setParkName(data.park?.name || parkCode);
        setStores(data.stores || []);
        setStats(data.stats || { total: 0, pending: 0, found: 0, notFound: 0, totalSpent: 0 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parkCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter stores based on selected filter
  const filteredStores = stores.map(store => {
    let filteredItems = store.items;
    if (filter === 'pending') {
      filteredItems = store.items.filter(i => i.status === 'pending');
    } else if (filter === 'found') {
      filteredItems = store.items.filter(i => i.status === 'found');
    } else if (filter === 'not_found') {
      filteredItems = store.items.filter(i => i.status === 'not_found');
    }
    return { ...store, items: filteredItems };
  }).filter(store => store.items.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur -mx-4 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/shopping-trips">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg leading-tight">{parkName}</h1>
              <p className="text-sm text-muted-foreground">
                {stats.pending} pending &bull; {stats.total} total
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Running Total */}
        {stats.found > 0 && (
          <div className="mt-2 py-2 px-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-green-700">
              {stats.found} items found
            </span>
            <span className="font-bold text-green-700">
              ${stats.totalSpent.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="all" className="text-xs">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-xs">
            Pending ({stats.pending})
          </TabsTrigger>
          <TabsTrigger value="found" className="text-xs">
            Found ({stats.found})
          </TabsTrigger>
          <TabsTrigger value="not_found" className="text-xs">
            N/F ({stats.notFound})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Store Sections */}
      {filteredStores.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground">
            {filter === 'all' ? 'No items for this park' : `No ${filter.replace('_', ' ')} items`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredStores.map(store => (
            <StoreSection
              key={store.storeName}
              storeName={store.storeName}
              landName={store.landName}
              items={store.items}
              onItemUpdate={() => fetchData()}
              defaultExpanded={filter === 'pending' || filteredStores.length <= 3}
            />
          ))}
        </div>
      )}
    </div>
  );
}
