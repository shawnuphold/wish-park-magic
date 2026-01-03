"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Park } from '@/lib/database.types';

interface TripRequest {
  id: string;
  status: string;
  customer: { name: string };
  items: { id: string; name: string; status: string; park: Park }[];
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
  const { toast } = useToast();

  const [trip, setTrip] = useState<ShoppingTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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
          items:request_items(id, name, status, park)
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

  // Group items by park for easy shopping
  const itemsByPark: Record<Park, { requestId: string; customerName: string; item: TripRequest['items'][0] }[]> = {
    disney: [],
    universal: [],
    seaworld: [],
  };

  trip.requests.forEach((request) => {
    request.items.forEach((item) => {
      if (trip.parks.includes(item.park)) {
        itemsByPark[item.park].push({
          requestId: request.id,
          customerName: request.customer?.name || 'Unknown',
          item,
        });
      }
    });
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

        <div className="flex gap-2">
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
      <div className="flex gap-2">
        {trip.parks.map((park) => (
          <Badge key={park} className={`${getParkColor(park)} text-base py-1 px-3`}>
            <MapPin className="w-4 h-4 mr-1" />
            {park}
          </Badge>
        ))}
      </div>

      {trip.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{trip.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Shopping List by Park */}
      <div className="space-y-6">
        {trip.parks.map((park) => {
          const parkItems = itemsByPark[park];
          return (
            <Card key={park}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge className={getParkColor(park)}>{park}</Badge>
                  <span className="text-sm font-normal text-muted-foreground">
                    {parkItems.length} item{parkItems.length !== 1 ? 's' : ''}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parkItems.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No items for this park</p>
                ) : (
                  <div className="space-y-2">
                    {parkItems.map(({ requestId, customerName, item }) => (
                      <Link
                        key={item.id}
                        href={`/admin/requests/${requestId}`}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getItemStatusIcon(item.status)}
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground">for {customerName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Assigned Requests */}
      <Card>
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
    </div>
  );
}
