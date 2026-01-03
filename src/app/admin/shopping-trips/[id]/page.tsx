'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  StoreGroup,
  TripItemCard,
  MarkFoundModal,
  MarkNotFoundModal,
  TripSummary,
} from '@/components/admin/shopping';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Calendar,
  User,
  Play,
  CheckCircle,
  Package,
  LayoutGrid,
  List,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PARK_LABELS: Record<string, string> = {
  disney_mk: 'Magic Kingdom',
  disney_epcot: 'EPCOT',
  disney_hs: 'Hollywood Studios',
  disney_ak: 'Animal Kingdom',
  disney_springs: 'Disney Springs',
  universal_usf: 'Universal Studios',
  universal_ioa: 'Islands of Adventure',
  universal_citywalk: 'CityWalk',
  universal_epic: 'Epic Universe',
  seaworld: 'SeaWorld',
};

interface TripItem {
  id: string;
  name: string;
  category: string;
  store_name: string | null;
  trip_status: string | null;
  priority: number;
  estimated_price?: number | null;
  actual_price?: number | null;
  quantity: number;
  reference_image_url?: string | null;
  found_image_url?: string | null;
  description?: string | null;
  trip_notes?: string | null;
  request?: {
    id: string;
    customer?: { id: string; name: string; phone?: string | null } | null;
  } | null;
}

interface Trip {
  id: string;
  name: string | null;
  trip_date: string | null;
  park: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  shopper?: { id: string; name: string } | null;
  notes: string | null;
  items: TripItem[];
  items_by_store: Record<string, TripItem[]>;
  item_count: number;
  found_count: number;
  not_found_count: number;
  pending_count: number;
}

export default function ShoppingTripDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'store' | 'customer' | 'list'>('store');
  const [showSummary, setShowSummary] = useState(false);

  // Modal states
  const [selectedItem, setSelectedItem] = useState<TripItem | null>(null);
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [showNotFoundModal, setShowNotFoundModal] = useState(false);

  const fetchTrip = useCallback(async () => {
    try {
      const response = await fetch(`/api/shopping-trips/${id}`);
      if (response.ok) {
        const data = await response.json();
        setTrip(data.trip);
      } else {
        toast({
          title: 'Error',
          description: 'Trip not found',
          variant: 'destructive',
        });
        router.push('/admin/shopping-trips');
      }
    } catch (error) {
      console.error('Error fetching trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trip',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [id, router, toast]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const handleStartTrip = async () => {
    try {
      const response = await fetch(`/api/shopping-trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      if (response.ok) {
        toast({
          title: 'Trip started',
          description: 'Good luck shopping!',
        });
        fetchTrip();
      }
    } catch (error) {
      console.error('Error starting trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to start trip',
        variant: 'destructive',
      });
    }
  };

  const handleCompleteTrip = async () => {
    try {
      const response = await fetch(`/api/shopping-trips/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (response.ok) {
        toast({
          title: 'Trip completed',
          description: 'Great job!',
        });
        router.push('/admin/shopping-trips');
      }
    } catch (error) {
      console.error('Error completing trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete trip',
        variant: 'destructive',
      });
    }
  };

  const handleMarkFound = (item: TripItem) => {
    setSelectedItem(item);
    setShowFoundModal(true);
  };

  const handleMarkNotFound = (item: TripItem) => {
    setSelectedItem(item);
    setShowNotFoundModal(true);
  };

  const handleItemUpdated = () => {
    fetchTrip();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Trip not found</p>
        <Link href="/admin/shopping-trips">
          <Button variant="outline" className="mt-4">Back to Trips</Button>
        </Link>
      </div>
    );
  }

  // Show summary view
  if (showSummary) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSummary(false)}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Shopping
        </Button>
        <TripSummary trip={trip} onComplete={handleCompleteTrip} />
      </div>
    );
  }

  // Filter items based on status
  const getFilteredItems = (items: TripItem[]) => {
    if (statusFilter === 'all') return items;
    if (statusFilter === 'pending') {
      return items.filter(i => ['pending', 'assigned', 'shopping'].includes(i.trip_status || 'pending'));
    }
    if (statusFilter === 'found') {
      return items.filter(i => i.trip_status === 'found');
    }
    if (statusFilter === 'not_found') {
      return items.filter(i => ['not_found', 'out_of_stock'].includes(i.trip_status || ''));
    }
    return items;
  };

  // Group items by customer for alternate view
  const itemsByCustomer: Record<string, TripItem[]> = {};
  trip.items.forEach(item => {
    const customerName = item.request?.customer?.name || 'Unknown Customer';
    if (!itemsByCustomer[customerName]) {
      itemsByCustomer[customerName] = [];
    }
    itemsByCustomer[customerName].push(item);
  });

  const filteredItems = getFilteredItems(trip.items);
  const progressPercent = trip.item_count > 0
    ? Math.round((trip.found_count + trip.not_found_count) / trip.item_count * 100)
    : 0;

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur -mx-4 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/shopping-trips">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                {trip.name || `Trip - ${trip.trip_date}`}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {trip.park && (
                  <>
                    <MapPin className="w-3 h-3" />
                    <span>{PARK_LABELS[trip.park] || trip.park}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge
            className={
              trip.status === 'active'
                ? 'bg-green-100 text-green-700'
                : trip.status === 'planning'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }
          >
            {trip.status}
          </Badge>
        </div>

        {/* Progress */}
        {trip.status === 'active' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>
                {trip.found_count + trip.not_found_count} of {trip.item_count} items
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Planning state - show start button */}
      {trip.status === 'planning' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-blue-600" />
          <p className="font-medium text-blue-900">Trip not started yet</p>
          <p className="text-sm text-blue-700 mb-3">
            {trip.item_count} items ready to shop
          </p>
          <Button onClick={handleStartTrip} variant="gold" size="lg">
            <Play className="w-4 h-4 mr-2" />
            Start Shopping
          </Button>
        </div>
      )}

      {/* Completed state */}
      {trip.status === 'completed' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
          <p className="font-medium text-green-900">Trip completed!</p>
          <p className="text-sm text-green-700">
            {trip.found_count} found, {trip.not_found_count} not found
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center justify-between gap-2">
        <Tabs value={statusFilter} onValueChange={setStatusFilter} className="flex-1">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-xs">
              All ({trip.item_count})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pending ({trip.pending_count})
            </TabsTrigger>
            <TabsTrigger value="found" className="text-xs">
              Found ({trip.found_count})
            </TabsTrigger>
            <TabsTrigger value="not_found" className="text-xs">
              N/F ({trip.not_found_count})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-1">
        <Button
          variant={viewMode === 'store' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('store')}
        >
          <MapPin className="w-3.5 h-3.5 mr-1" />
          By Store
        </Button>
        <Button
          variant={viewMode === 'customer' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('customer')}
        >
          <User className="w-3.5 h-3.5 mr-1" />
          By Customer
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
        >
          <List className="w-3.5 h-3.5 mr-1" />
          List
        </Button>
      </div>

      {/* Items */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No items match this filter</p>
        </div>
      ) : viewMode === 'store' ? (
        <div className="space-y-4">
          {Object.entries(trip.items_by_store).map(([storeName, items]) => {
            const filteredStoreItems = getFilteredItems(items);
            if (filteredStoreItems.length === 0) return null;
            return (
              <StoreGroup
                key={storeName}
                storeName={storeName}
                items={filteredStoreItems}
                onMarkFound={handleMarkFound}
                onMarkNotFound={handleMarkNotFound}
                disabled={trip.status !== 'active'}
              />
            );
          })}
        </div>
      ) : viewMode === 'customer' ? (
        <div className="space-y-4">
          {Object.entries(itemsByCustomer).map(([customerName, items]) => {
            const filteredCustomerItems = getFilteredItems(items);
            if (filteredCustomerItems.length === 0) return null;
            return (
              <StoreGroup
                key={customerName}
                storeName={customerName}
                items={filteredCustomerItems}
                onMarkFound={handleMarkFound}
                onMarkNotFound={handleMarkNotFound}
                disabled={trip.status !== 'active'}
              />
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map(item => (
            <TripItemCard
              key={item.id}
              item={item}
              onMarkFound={handleMarkFound}
              onMarkNotFound={handleMarkNotFound}
              disabled={trip.status !== 'active'}
            />
          ))}
        </div>
      )}

      {/* Floating action bar */}
      {trip.status === 'active' && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowSummary(true)}
          >
            View Summary
          </Button>
          {trip.pending_count === 0 && (
            <Button
              variant="gold"
              className="flex-1"
              onClick={handleCompleteTrip}
            >
              Complete Trip
            </Button>
          )}
        </div>
      )}

      {/* Modals */}
      <MarkFoundModal
        open={showFoundModal}
        onOpenChange={setShowFoundModal}
        item={selectedItem}
        tripId={id}
        onConfirm={handleItemUpdated}
      />
      <MarkNotFoundModal
        open={showNotFoundModal}
        onOpenChange={setShowNotFoundModal}
        item={selectedItem}
        tripId={id}
        onConfirm={handleItemUpdated}
      />
    </div>
  );
}
