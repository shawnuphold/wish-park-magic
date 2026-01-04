"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { RESORTS, getParkBySlug, type NotFoundReason } from '@/lib/park-shopping-config';
import { FilterTabs, type FilterStatus } from '@/components/park-shopping/FilterTabs';
import { RunningTotal } from '@/components/park-shopping/RunningTotal';
import { StoreSection } from '@/components/park-shopping/StoreSection';
import { RequestCard, type RequestItemData } from '@/components/park-shopping/RequestCard';
import { ChevronLeft, Search, RefreshCw } from 'lucide-react';

export default function ParkRequestsPage() {
  const params = useParams();
  const resort = params.resort as string;
  const parkSlug = params.park as string;
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<RequestItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  const resortConfig = RESORTS[resort];
  const parkConfig = getParkBySlug(resort, parkSlug);

  const fetchItems = useCallback(async () => {
    if (!parkConfig) return;

    try {
      // Build the query to get items for this park
      // Include: specific park, generic resort name, 'multiple', and null (unassigned)
      const parkValues = [parkConfig.dbValue, resort, 'multiple'];

      const { data, error } = await supabase
        .from('request_items')
        .select(`
          id,
          name,
          description,
          reference_image_url,
          reference_images,
          found_image_url,
          found_images,
          quantity,
          estimated_price,
          actual_price,
          status,
          store_name,
          land_name,
          notes,
          category,
          created_at,
          request:requests!request_items_request_id_fkey (
            id,
            notes,
            created_at,
            customer:customers!requests_customer_id_fkey (
              id,
              name,
              email,
              phone,
              facebook_name
            )
          )
        `)
        .or(`park.in.(${parkValues.map(v => `"${v}"`).join(',')}),park.is.null`)
        .order('store_name', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching items:', error);
        toast({
          title: 'Error',
          description: 'Failed to load items',
          variant: 'destructive',
        });
        return;
      }

      // Transform and filter out items without valid requests
      const transformedItems: RequestItemData[] = (data || [])
        .filter(item => item.request && item.request.customer)
        .map(item => {
          // Extract not_found_reason from notes if present
          let not_found_reason: string | undefined;
          if (item.notes?.startsWith('[NOT FOUND:')) {
            const match = item.notes.match(/\[NOT FOUND: ([^\]]+)\]/);
            if (match) {
              not_found_reason = match[1];
            }
          }

          return {
            id: item.id,
            name: item.name,
            description: item.description,
            reference_image_url: item.reference_image_url,
            reference_images: (item as { reference_images: string[] | null }).reference_images,
            found_image_url: item.found_image_url,
            found_images: (item as { found_images: string[] | null }).found_images,
            quantity: item.quantity,
            estimated_price: item.estimated_price,
            actual_price: item.actual_price,
            status: item.status as 'pending' | 'found' | 'not_found' | 'substituted',
            store_name: item.store_name,
            notes: item.notes,
            category: item.category,
            created_at: item.created_at,
            request: {
              id: (item.request as { id: string }).id,
              notes: (item.request as { notes: string | null }).notes,
              created_at: (item.request as { created_at: string }).created_at,
              customer: (item.request as { customer: { id: string; name: string; email: string; phone: string | null; facebook_name: string | null } }).customer,
            },
            not_found_reason,
          };
        });

      setItems(transformedItems);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parkConfig, resort, toast]);

  useEffect(() => {
    if (!resortConfig || !parkConfig) {
      router.push('/admin/park-shopping');
      return;
    }

    fetchItems();
  }, [resortConfig, parkConfig, router, fetchItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
  };

  const handleMarkFound = async (itemId: string, data: {
    quantity_found: number;
    actual_price: number;
    store_name?: string;
    found_images?: string[];
    notes?: string;
  }) => {
    try {
      const res = await fetch(`/api/park-shopping/items/${itemId}/found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to mark as found');
      }

      toast({
        title: 'Marked as Found',
        description: 'Item has been marked as found.',
      });

      // Refresh the list
      await fetchItems();
    } catch (error) {
      console.error('Error marking found:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark item as found.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkNotFound = async (itemId: string, data: {
    reason: NotFoundReason;
    notes?: string;
  }) => {
    try {
      const res = await fetch(`/api/park-shopping/items/${itemId}/not-found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to mark as not found');
      }

      toast({
        title: 'Marked as Not Found',
        description: 'Item has been marked as not found.',
      });

      await fetchItems();
    } catch (error) {
      console.error('Error marking not found:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark item as not found.',
        variant: 'destructive',
      });
    }
  };

  const handleReset = async (itemId: string) => {
    try {
      const res = await fetch(`/api/park-shopping/items/${itemId}/reset`, {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Failed to reset');
      }

      toast({
        title: 'Reset to Pending',
        description: 'Item has been reset to pending.',
      });

      await fetchItems();
    } catch (error) {
      console.error('Error resetting:', error);
      toast({
        title: 'Error',
        description: 'Failed to reset item.',
        variant: 'destructive',
      });
    }
  };

  if (!resortConfig || !parkConfig) {
    return null;
  }

  // Filter items
  const filteredItems = items.filter(item => {
    // Status filter
    if (filter !== 'all' && item.status !== filter) {
      return false;
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(searchLower);
      const matchesCustomer = item.request.customer.name.toLowerCase().includes(searchLower);
      const matchesStore = item.store_name?.toLowerCase().includes(searchLower);
      return matchesName || matchesCustomer || matchesStore;
    }

    return true;
  });

  // Calculate counts
  const counts = {
    all: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    found: items.filter(i => i.status === 'found').length,
    not_found: items.filter(i => i.status === 'not_found').length,
  };

  // Calculate running total
  const foundItems = items.filter(i => i.status === 'found' && i.actual_price);
  const runningTotal = foundItems.reduce((sum, i) => sum + (i.actual_price! * i.quantity), 0);

  // Group items by store
  const groupedByStore = filteredItems.reduce((acc, item) => {
    const storeName = item.store_name || 'No Store Assigned';
    if (!acc[storeName]) {
      acc[storeName] = [];
    }
    acc[storeName].push(item);
    return acc;
  }, {} as Record<string, RequestItemData[]>);

  // Sort store names (put 'No Store Assigned' at the end)
  const sortedStoreNames = Object.keys(groupedByStore).sort((a, b) => {
    if (a === 'No Store Assigned') return 1;
    if (b === 'No Store Assigned') return -1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/park-shopping/${resort}`)}
            className="h-10 w-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{parkConfig.emoji}</span>
            <div>
              <h1 className="text-xl font-heading font-bold text-foreground">
                {parkConfig.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                {counts.all} request{counts.all !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-10 w-10"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Filter tabs */}
      <FilterTabs
        currentFilter={filter}
        onFilterChange={setFilter}
        counts={counts}
      />

      {/* Running total (for found items) */}
      {foundItems.length > 0 && (
        <RunningTotal total={runningTotal} itemCount={foundItems.length} />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search items, customers, stores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Items grouped by store */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No items match your filters</p>
        </div>
      ) : sortedStoreNames.length > 1 ? (
        // Show store sections when we have multiple stores
        <div className="space-y-6">
          {sortedStoreNames.map((storeName) => (
            <StoreSection
              key={storeName}
              storeName={storeName}
              items={groupedByStore[storeName]}
              onMarkFound={handleMarkFound}
              onMarkNotFound={handleMarkNotFound}
              onReset={handleReset}
            />
          ))}
        </div>
      ) : (
        // Show flat list when all items are in one store or no store
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              onMarkFound={handleMarkFound}
              onMarkNotFound={handleMarkNotFound}
              onReset={handleReset}
            />
          ))}
        </div>
      )}

      {/* Bottom padding for mobile */}
      <div className="h-24" />
    </div>
  );
}
