"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Plus, CalendarDays, MapPin, ShoppingCart, User, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Park } from '@/lib/database.types';

interface ShoppingTrip {
  id: string;
  date: string;
  parks: Park[];
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  shopper: { name: string } | null;
  request_count: number;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<ShoppingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchTrips = async () => {
      try {
        // Fetch trips
        const { data: tripsData, error } = await supabase
          .from('shopping_trips')
          .select(`
            *,
            shopper:admin_users(name)
          `)
          .order('date', { ascending: true });

        if (error) throw error;

        // Fetch request counts for each trip
        const tripIds = tripsData?.map(t => t.id) || [];
        const { data: requestCounts } = await supabase
          .from('requests')
          .select('shopping_trip_id')
          .in('shopping_trip_id', tripIds);

        // Count requests per trip
        const countMap: Record<string, number> = {};
        requestCounts?.forEach(r => {
          if (r.shopping_trip_id) {
            countMap[r.shopping_trip_id] = (countMap[r.shopping_trip_id] || 0) + 1;
          }
        });

        setTrips(
          tripsData?.map((t) => ({
            id: t.id,
            date: t.date,
            parks: t.parks as Park[],
            status: t.status as ShoppingTrip['status'],
            notes: t.notes,
            shopper: t.shopper as { name: string } | null,
            request_count: countMap[t.id] || 0,
          })) || []
        );
      } catch (error) {
        console.error('Error fetching trips:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrips();
  }, []);

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

  // Get dates with trips for calendar highlighting
  const tripDates = trips.map((t) => new Date(t.date + 'T00:00:00'));

  const upcomingTrips = trips.filter(
    (t) => t.status === 'planned' && new Date(t.date) >= new Date()
  );

  const pastTrips = trips.filter(
    (t) => t.status !== 'planned' || new Date(t.date) < new Date()
  );

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
        <div>
          <h1 className="text-xl lg:text-2xl font-heading font-bold text-foreground">Shopping Trips</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Plan and manage park shopping trips</p>
        </div>
        <Link href="/admin/trips/new">
          <Button variant="gold" size="sm" className="lg:hidden">
            <Plus className="w-5 h-5" />
          </Button>
          <Button variant="gold" className="hidden lg:flex">
            <Plus className="w-4 h-4 mr-2" />
            Plan Trip
          </Button>
        </Link>
      </div>

      {/* Mobile Calendar Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-lg"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="w-4 h-4 text-gold" />
            {selectedDate?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          {showCalendar ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {showCalendar && (
          <Card className="mt-2">
            <CardContent className="p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  setSelectedDate(date);
                  setShowCalendar(false);
                }}
                modifiers={{
                  hasTrip: tripDates,
                }}
                modifiersClassNames={{
                  hasTrip: "bg-gold/20 font-bold",
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {/* Upcoming Trips */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Upcoming Trips</h2>
            </CardHeader>
            <CardContent>
              {upcomingTrips.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarDays className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No upcoming trips scheduled</p>
                  <Link href="/admin/trips/new">
                    <Button variant="outline" className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Plan your first trip
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingTrips.map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/admin/trips/${trip.id}`}
                      className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <CalendarDays className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(trip.date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {trip.parks.map((park) => (
                              <Badge key={park} className={getParkColor(park)}>
                                {park}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <ShoppingCart className="w-3 h-3" />
                              {trip.request_count} request{trip.request_count !== 1 ? 's' : ''}
                            </span>
                            {trip.shopper && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {trip.shopper.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge className={getStatusColor(trip.status)}>
                          {trip.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Trips */}
          {pastTrips.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Past Trips</h2>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pastTrips.slice(0, 5).map((trip) => (
                    <Link
                      key={trip.id}
                      href={`/admin/trips/${trip.id}`}
                      className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <CalendarDays className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(trip.date + 'T00:00:00').toLocaleDateString()}
                          </span>
                          <div className="flex gap-1">
                            {trip.parks.map((park) => (
                              <Badge key={park} variant="outline" className="text-xs capitalize">
                                {park}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <Badge className={getStatusColor(trip.status)}>
                          {trip.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Calendar Sidebar - Desktop Only */}
        <Card className="hidden lg:block">
          <CardHeader>
            <h2 className="text-lg font-semibold">Calendar</h2>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={{
                hasTrip: tripDates,
              }}
              modifiersClassNames={{
                hasTrip: "bg-gold/20 font-bold",
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
