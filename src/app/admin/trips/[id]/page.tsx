"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  User,
  Package,
  Play,
  CheckCircle,
  XCircle,
  Printer,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Park } from '@/lib/database.types';

interface TripRequest {
  id: string;
  status: string;
  customer: { name: string };
  items: { id: string; name: string; status: string; park: Park; specific_park: string | null; store_name: string | null; land_name: string | null }[];
}

interface ShoppingTrip {
  id: string;
  date: string;
  parks: Park[];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  shopper: { name: string } | null;
  requests: TripRequest[];
}

const statusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function TripDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [trip, setTrip] = useState<ShoppingTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTrip();
  }, [id]);

  const fetchTrip = async () => {
    try {
      // First fetch the trip
      const { data: tripData, error: tripError } = await supabase
        .from('shopping_trips')
        .select(`
          *,
          shopper:admin_users(name)
        `)
        .eq('id', id)
        .single();

      if (tripError) throw tripError;

      // Then fetch associated requests
      const { data: requestsData } = await supabase
        .from('requests')
        .select(`
          id,
          status,
          customer:customers(name),
          items:request_items(id, name, status, park, specific_park, store_name, land_name)
        `)
        .eq('shopping_trip_id', id);

      setTrip({
        ...tripData,
        parks: tripData.parks as Park[],
        status: tripData.status as ShoppingTrip['status'],
        shopper: tripData.shopper as { name: string } | null,
        requests: (requestsData || []).map((r: any) => ({
          ...r,
          customer: r.customer as { name: string },
          items: r.items || [],
        })),
      });
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
  };

  const updateTripStatus = async (newStatus: string) => {
    if (!trip) return;
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('shopping_trips')
        .update({ status: newStatus as 'planned' | 'in_progress' | 'completed' | 'cancelled' })
        .eq('id', trip.id);

      if (error) throw error;

      // If starting the trip, update all assigned requests to "shopping" status
      if (newStatus === 'in_progress') {
        await supabase
          .from('requests')
          .update({ status: 'shopping' })
          .eq('shopping_trip_id', trip.id);
      }

      // If completing the trip, update all requests to "found" status
      if (newStatus === 'completed') {
        await supabase
          .from('requests')
          .update({ status: 'found' })
          .eq('shopping_trip_id', trip.id);
      }

      setTrip((prev) => prev ? { ...prev, status: newStatus as ShoppingTrip['status'] } : null);
      toast({
        title: 'Status updated',
        description: `Trip status changed to ${newStatus.replace('_', ' ')}`,
      });

      fetchTrip(); // Refresh to get updated request statuses
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const deleteTrip = async () => {
    if (!trip) return;
    setDeleting(true);

    try {
      // First, unassign any requests from this trip
      await supabase
        .from('requests')
        .update({ shopping_trip_id: null, status: 'approved' })
        .eq('shopping_trip_id', trip.id);

      // Then delete the trip
      const { error } = await supabase
        .from('shopping_trips')
        .delete()
        .eq('id', trip.id);

      if (error) throw error;

      toast({
        title: 'Trip deleted',
        description: 'Shopping trip has been deleted successfully',
      });

      router.push('/admin/trips');
    } catch (error) {
      console.error('Error deleting trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete trip',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planned: 'bg-blue-500/10 text-blue-600',
      in_progress: 'bg-orange-500/10 text-orange-600',
      completed: 'bg-green-500/10 text-green-600',
      cancelled: 'bg-red-500/10 text-red-600',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600';
  };

  const getParkColor = (park: Park) => {
    const colors: Record<Park, string> = {
      disney: 'bg-blue-500/10 text-blue-600',
      universal: 'bg-purple-500/10 text-purple-600',
      seaworld: 'bg-cyan-500/10 text-cyan-600',
    };
    return colors[park];
  };

  const getItemStatusIcon = (status: string) => {
    switch (status) {
      case 'found':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'not_found':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Package className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Trip not found</p>
        <Link href="/admin/trips">
          <Button variant="outline" className="mt-4">Back to Trips</Button>
        </Link>
      </div>
    );
  }

  // Group items by park and then by store for easy shopping
  type GroupedItem = { requestId: string; customerName: string; item: TripRequest['items'][0] };
  type StoreGroup = { store: string; land: string | null; specificPark: string | null; items: GroupedItem[] };

  const itemsByParkAndStore: Record<Park, StoreGroup[]> = {
    disney: [],
    universal: [],
    seaworld: [],
  };

  trip.requests.forEach((request) => {
    request.items.forEach((item) => {
      if (trip.parks.includes(item.park)) {
        const storeName = item.store_name || 'General / Unknown Location';
        const landName = item.land_name || null;
        const specificPark = item.specific_park || null;

        // Find or create store group (match on store + land + specific park)
        let storeGroup = itemsByParkAndStore[item.park].find(
          g => g.store === storeName && g.specificPark === specificPark
        );
        if (!storeGroup) {
          storeGroup = { store: storeName, land: landName, specificPark, items: [] };
          itemsByParkAndStore[item.park].push(storeGroup);
        }

        storeGroup.items.push({
          requestId: request.id,
          customerName: request.customer?.name || 'Unknown',
          item,
        });
      }
    });
  });

  // Sort store groups alphabetically within each park (with "General" last)
  Object.keys(itemsByParkAndStore).forEach((park) => {
    itemsByParkAndStore[park as Park].sort((a, b) => {
      if (a.store.startsWith('General')) return 1;
      if (b.store.startsWith('General')) return -1;
      return a.store.localeCompare(b.store);
    });
  });

  // For backwards compatibility - flat list of items by park
  const itemsByPark: Record<Park, GroupedItem[]> = {
    disney: itemsByParkAndStore.disney.flatMap(g => g.items),
    universal: itemsByParkAndStore.universal.flatMap(g => g.items),
    seaworld: itemsByParkAndStore.seaworld.flatMap(g => g.items),
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Print-only header */}
      <div className="hidden print:block print-trip-header">
        <h1 className="text-2xl font-bold">
          Shopping Trip - {new Date(trip.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </h1>
        <p>Parks: {trip.parks.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}</p>
        {trip.shopper && <p>Shopper: {trip.shopper.name}</p>}
        <p>{trip.requests.reduce((sum, r) => sum + r.items.length, 0)} items total</p>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/admin/trips">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {new Date(trip.date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h1>
              <Badge className={getStatusColor(trip.status)}>
                {trip.status.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-muted-foreground">
              {trip.shopper && (
                <span className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {trip.shopper.name}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print List
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          {trip.status === 'planned' && (
            <Button
              variant="gold"
              onClick={() => updateTripStatus('in_progress')}
              disabled={updating}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Trip
            </Button>
          )}
          {trip.status === 'in_progress' && (
            <>
              <Link href={`/admin/trips/${trip.id}/shop`}>
                <Button variant="gold">
                  <Play className="w-4 h-4 mr-2" />
                  Go Shopping
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => updateTripStatus('completed')}
                disabled={updating}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            </>
          )}
          <Select
            value={trip.status}
            onValueChange={updateTripStatus}
            disabled={updating}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Parks */}
      <div className="flex gap-2 print:hidden">
        {trip.parks.map((park) => (
          <Badge key={park} className={`${getParkColor(park)} text-base py-1 px-3`}>
            <MapPin className="w-4 h-4 mr-1" />
            {park}
          </Badge>
        ))}
      </div>

      {/* Shop Mode Hint Card */}
      {(trip.status === 'planned' || trip.status === 'in_progress') && trip.requests.length > 0 && (
        <Card className="print:hidden bg-gradient-to-r from-gold/10 to-gold/5 border-gold/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Ready to shop?</p>
                  <p className="text-sm text-muted-foreground">
                    {trip.status === 'planned'
                      ? 'Start the trip to enable Shop Mode where you can mark items as found'
                      : 'Use Shop Mode to check off items, add photos, and record prices'}
                  </p>
                </div>
              </div>
              {trip.status === 'planned' ? (
                <Button
                  variant="gold"
                  onClick={() => updateTripStatus('in_progress')}
                  disabled={updating}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Trip
                </Button>
              ) : (
                <Link href={`/admin/trips/${trip.id}/shop`}>
                  <Button variant="gold" size="lg">
                    <Play className="w-4 h-4 mr-2" />
                    Enter Shop Mode
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {trip.notes && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{trip.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Shopping List by Park */}
      <div className="space-y-6 print:space-y-4">
        {trip.parks.map((park) => {
          const parkItems = itemsByPark[park];
          const storeGroups = itemsByParkAndStore[park];
          return (
            <Card key={park} className="print:border-0 print:shadow-none">
              <CardHeader className="print:pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Badge className={getParkColor(park)}>{park}</Badge>
                  <span className="text-sm font-normal text-muted-foreground">
                    {parkItems.length} item{parkItems.length !== 1 ? 's' : ''} in {storeGroups.length} location{storeGroups.length !== 1 ? 's' : ''}
                  </span>
                </CardTitle>
                {/* Print-only park header */}
                <div className="hidden print:block print-park-header capitalize">
                  {park} ({parkItems.length} items)
                </div>
              </CardHeader>
              <CardContent className="print:p-0">
                {parkItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4 print:hidden">No items for this park</p>
                ) : (
                  <div className="space-y-6 print:space-y-4">
                    {storeGroups.map((storeGroup) => (
                      <div key={storeGroup.store} className="space-y-2">
                        {/* Store/Location Header */}
                        <div className="flex items-center gap-2 pb-2 border-b flex-wrap">
                          <MapPin className="w-4 h-4 text-gold flex-shrink-0" />
                          {storeGroup.specificPark && (
                            <span className="font-semibold text-gold">{storeGroup.specificPark}</span>
                          )}
                          {storeGroup.land && (
                            <span className="text-sm text-muted-foreground">• {storeGroup.land}</span>
                          )}
                          <span className="font-medium">• {storeGroup.store}</span>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {storeGroup.items.length} item{storeGroup.items.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Items in this store */}
                        <div className="space-y-2 print:space-y-0 pl-6">
                          {storeGroup.items.map(({ requestId, customerName, item }) => (
                            <div key={item.id} className="print-shopping-item">
                              {/* Print checkbox */}
                              <div className="hidden print:block print-checkbox" />

                              <Link
                                href={`/admin/requests/${requestId}`}
                                className="flex-1 flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors print:p-0 print:border-0"
                              >
                                <div className="flex items-center gap-3 print:gap-2">
                                  <span className="print:hidden">{getItemStatusIcon(item.status)}</span>
                                  <div>
                                    <p className="font-medium print:text-sm">{item.name}</p>
                                    <p className="text-sm text-muted-foreground print:text-xs">for {customerName}</p>
                                  </div>
                                </div>
                                <Badge variant="outline" className="capitalize print:hidden">
                                  {item.status.replace('_', ' ')}
                                </Badge>
                                {/* Print-only price placeholder */}
                                <span className="hidden print:inline-block text-sm">
                                  $________
                                </span>
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assigned Requests */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Assigned Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {trip.requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No requests assigned to this trip</p>
          ) : (
            <div className="space-y-2">
              {trip.requests.map((request) => (
                <Link
                  key={request.id}
                  href={`/admin/requests/${request.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{request.customer?.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.items.length} item{request.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Badge className={getStatusColor(request.status)}>
                    {request.status}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shopping Trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this shopping trip. Any assigned requests will be
              unassigned and returned to &quot;approved&quot; status. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteTrip}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Trip'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
