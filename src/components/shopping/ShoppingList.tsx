'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, Package, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
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

type FilterType = 'all' | 'pending' | 'found' | 'not_found';

export function ShoppingList({ parkCode }: ShoppingListProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parkName, setParkName] = useState('');
  const [parkIcon, setParkIcon] = useState('📍');
  const [stores, setStores] = useState<Store[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, found: 0, notFound: 0, totalSpent: 0 });
  const [filter, setFilter] = useState<FilterType>('pending');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const response = await fetch(`/api/shopping/${parkCode}`);
      if (response.ok) {
        const data = await response.json();
        setParkName(data.park?.name || parkCode);
        setParkIcon(data.park?.icon || '📍');
        setStores(data.stores || []);
        setStats(data.stats || { total: 0, pending: 0, found: 0, notFound: 0, totalSpent: 0 });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load shopping list');
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

  const filterOptions: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: 'pending', label: 'To Find', count: stats.pending, color: 'amber' },
    { key: 'found', label: 'Found', count: stats.found, color: 'green' },
    { key: 'not_found', label: 'N/A', count: stats.notFound, color: 'red' },
    { key: 'all', label: 'All', count: stats.total, color: 'gray' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/shopping-trips">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{parkIcon}</span>
                <div>
                  <h1 className="font-bold text-lg leading-tight">{parkName}</h1>
                  <p className="text-sm text-muted-foreground">
                    {stats.pending} to find
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-full hover:bg-gray-100 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {filterOptions.map(opt => (
              <button
                key={opt.key}
                onClick={() => setFilter(opt.key)}
                className={`
                  flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${filter === opt.key
                    ? opt.color === 'amber' ? 'bg-amber-500 text-white'
                    : opt.color === 'green' ? 'bg-green-500 text-white'
                    : opt.color === 'red' ? 'bg-red-500 text-white'
                    : 'bg-gray-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }
                `}
              >
                {opt.label} ({opt.count})
              </button>
            ))}
          </div>
        </div>

        {/* Running Total Bar */}
        {stats.found > 0 && (
          <div className="px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              <span className="font-medium">
                {stats.found} {stats.found === 1 ? 'item' : 'items'} found
              </span>
            </div>
            <span className="text-xl font-bold">
              ${stats.totalSpent.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Store Sections */}
      <div className="px-4 py-4">
        {filteredStores.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg text-gray-500 font-medium">
              {filter === 'all' ? 'No items for this park' :
               filter === 'pending' ? 'All items found!' :
               filter === 'found' ? 'No items found yet' :
               'No unavailable items'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'pending' && stats.found > 0 && 'Great job!'}
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
    </div>
  );
}
