"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Park } from '@/lib/database.types';

interface AdminUser {
  id: string;
  name: string;
}

interface PendingRequest {
  id: string;
  customer_name: string;
  item_count: number;
  parks: Park[];
}

const parkOptions: { value: Park; label: string }[] = [
  { value: 'disney', label: 'Disney' },
  { value: 'universal', label: 'Universal' },
  { value: 'seaworld', label: 'SeaWorld' },
];

export default function NewTripPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedParks, setSelectedParks] = useState<Park[]>([]);
  const [shopperId, setShopperId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [shoppers, setShoppers] = useState<AdminUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch shoppers
        const { data: shopperData } = await supabase
          .from('admin_users')
          .select('id, name')
          .in('role', ['admin', 'shopper']);

        setShoppers(shopperData || []);

        // Fetch pending requests (no quote/approval required for shopping trips)
        const { data: requestData } = await supabase
          .from('requests')
          .select(`
            id,
            customer:customers(name),
            items:request_items(id, park)
          `)
          .in('status', ['pending', 'quoted', 'approved', 'scheduled', 'shopping'])
          .is('shopping_trip_id', null);

        setPendingRequests(
          requestData?.map((r) => {
            const items = r.items as { id: string; park: Park }[];
            const parks = Array.from(new Set(items.map((i) => i.park))) as Park[];
            return {
              id: r.id,
              customer_name: (r.customer as { name: string })?.name || 'Unknown',
              item_count: items.length,
              parks,
            };
          }) || []
        );
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const togglePark = (park: Park) => {
    setSelectedParks((prev) =>
      prev.includes(park) ? prev.filter((p) => p !== park) : [...prev, park]
    );
  };

  const toggleRequest = (requestId: string) => {
    setSelectedRequests((prev) =>
      prev.includes(requestId)
        ? prev.filter((id) => id !== requestId)
        : [...prev, requestId]
    );
  };

  // Filter requests based on selected parks
  const filteredRequests = pendingRequests.filter((req) =>
    selectedParks.length === 0 || req.parks.some((p) => selectedParks.includes(p))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return;
    }

    if (selectedParks.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one park',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create the shopping trip
      const { data: trip, error: tripError } = await supabase
        .from('shopping_trips')
        .insert({
          date: date.toISOString().split('T')[0],
          parks: selectedParks,
          shopper_id: shopperId || null,
          status: 'planned',
          notes: notes || null,
        })
        .select()
        .single();

      if (tripError) throw tripError;

      // Assign selected requests to this trip
      if (selectedRequests.length > 0) {
        const { error: updateError } = await supabase
          .from('requests')
          .update({
            shopping_trip_id: trip.id,
            status: 'scheduled',
          })
          .in('id', selectedRequests);

        if (updateError) throw updateError;
      }

      toast({
        title: 'Trip planned',
        description: `Shopping trip scheduled for ${date.toLocaleDateString()}`,
      });

      router.push(`/admin/trips/${trip.id}`);
    } catch (error: any) {
      console.error('Error creating trip:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create trip',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/trips">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Plan Shopping Trip</h1>
          <p className="text-muted-foreground">Schedule a new park shopping trip</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trip Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => d < new Date()}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parks to Visit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {parkOptions.map((park) => (
                  <div key={park.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={park.value}
                      checked={selectedParks.includes(park.value)}
                      onCheckedChange={() => togglePark(park.value)}
                    />
                    <Label htmlFor={park.value} className="font-normal">
                      {park.label}
                    </Label>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shopper Assignment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Assign to Shopper</Label>
                  <Select value={shopperId} onValueChange={setShopperId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shopper (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {shoppers.map((shopper) => (
                        <SelectItem key={shopper.id} value={shopper.id}>
                          {shopper.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special notes for this trip..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assign Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedParks.length === 0
                    ? 'Select parks to see available requests'
                    : 'No pending requests for selected parks'}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedRequests.includes(request.id)
                          ? 'border-gold bg-gold/10'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => toggleRequest(request.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedRequests.includes(request.id)}
                          onCheckedChange={() => toggleRequest(request.id)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{request.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.item_count} item{request.item_count !== 1 ? 's' : ''} •{' '}
                            {request.parks.join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/admin/trips">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" variant="gold" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Planning...
              </>
            ) : (
              `Plan Trip${selectedRequests.length > 0 ? ` (${selectedRequests.length} requests)` : ''}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
