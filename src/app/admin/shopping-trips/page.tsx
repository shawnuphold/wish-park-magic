'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingTripCard, CreateTripModal } from '@/components/admin/shopping';
import { Plus, Loader2, Calendar, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Trip {
  id: string;
  name: string | null;
  trip_date: string | null;
  park: string | null;
  status: 'planning' | 'active' | 'completed' | 'cancelled';
  shopper?: { id: string; name: string } | null;
  item_count?: number;
  found_count?: number;
  not_found_count?: number;
  pending_count?: number;
}

export default function ShoppingTripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { toast } = useToast();

  const fetchTrips = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/shopping-trips?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTrips(data.trips || []);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shopping trips',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleStartTrip = async (tripId: string) => {
    try {
      const response = await fetch(`/api/shopping-trips/${tripId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      if (response.ok) {
        toast({
          title: 'Trip started',
          description: 'Good luck shopping!',
        });
        fetchTrips();
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

  const handleTripCreated = () => {
    fetchTrips();
  };

  // Group trips by date for better organization
  const tripsByDate: Record<string, Trip[]> = {};
  trips.forEach(trip => {
    const date = trip.trip_date || 'No Date';
    if (!tripsByDate[date]) {
      tripsByDate[date] = [];
    }
    tripsByDate[date].push(trip);
  });

  const sortedDates = Object.keys(tripsByDate).sort((a, b) => {
    if (a === 'No Date') return 1;
    if (b === 'No Date') return -1;
    return new Date(b).getTime() - new Date(a).getTime();
  });

  // Calculate stats
  const activeTrips = trips.filter(t => t.status === 'active').length;
  const planningTrips = trips.filter(t => t.status === 'planning').length;
  const totalPendingItems = trips.reduce((sum, t) => sum + (t.pending_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold">Shopping Trips</h1>
          <p className="text-muted-foreground">
            {activeTrips > 0 && `${activeTrips} active • `}
            {planningTrips > 0 && `${planningTrips} planning • `}
            {totalPendingItems} items pending
          </p>
        </div>
        <Button variant="gold" onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Trip
        </Button>
      </div>

      {/* Filters */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Trip List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-lg font-medium text-muted-foreground">No shopping trips</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter !== 'all' ? 'Try a different filter or ' : ''}
            Create your first trip to get started
          </p>
          <Button
            variant="gold"
            className="mt-4"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Trip
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-medium text-muted-foreground">
                  {date === 'No Date'
                    ? 'No Date Set'
                    : new Date(date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                </h2>
                <span className="text-sm text-muted-foreground">
                  ({tripsByDate[date].length} trip{tripsByDate[date].length !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tripsByDate[date].map(trip => (
                  <ShoppingTripCard
                    key={trip.id}
                    trip={trip}
                    onStart={() => handleStartTrip(trip.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Trip Modal */}
      <CreateTripModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onTripCreated={handleTripCreated}
      />
    </div>
  );
}
