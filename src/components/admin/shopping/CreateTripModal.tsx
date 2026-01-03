'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, MapPin, Package, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ParkLocation } from '@/lib/database.types';

interface CreateTripModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTripCreated: (trip: any) => void;
}

const PARK_OPTIONS: { value: ParkLocation; label: string; group: string }[] = [
  { value: 'disney_mk', label: 'Magic Kingdom', group: 'Disney' },
  { value: 'disney_epcot', label: 'EPCOT', group: 'Disney' },
  { value: 'disney_hs', label: 'Hollywood Studios', group: 'Disney' },
  { value: 'disney_ak', label: 'Animal Kingdom', group: 'Disney' },
  { value: 'disney_springs', label: 'Disney Springs', group: 'Disney' },
  { value: 'universal_usf', label: 'Universal Studios', group: 'Universal' },
  { value: 'universal_ioa', label: 'Islands of Adventure', group: 'Universal' },
  { value: 'universal_citywalk', label: 'CityWalk', group: 'Universal' },
  { value: 'universal_epic', label: 'Epic Universe', group: 'Universal' },
  { value: 'seaworld', label: 'SeaWorld', group: 'SeaWorld' },
];

interface SuggestedItem {
  id: string;
  name: string;
  category: string;
  store_name: string | null;
  priority: number;
  request?: { customer?: { name: string } | null } | null;
}

export function CreateTripModal({ open, onOpenChange, onTripCreated }: CreateTripModalProps) {
  const [name, setName] = useState('');
  const [tripDate, setTripDate] = useState('');
  const [park, setPark] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [suggestedItems, setSuggestedItems] = useState<SuggestedItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Set default date to today
  useEffect(() => {
    if (open && !tripDate) {
      setTripDate(new Date().toISOString().split('T')[0]);
    }
  }, [open, tripDate]);

  // Fetch suggested items when park changes
  useEffect(() => {
    if (park) {
      fetchSuggestedItems(park);
    } else {
      setSuggestedItems([]);
      setSelectedItems(new Set());
    }
  }, [park]);

  const fetchSuggestedItems = async (selectedPark: string) => {
    setLoadingItems(true);
    try {
      const response = await fetch(`/api/shopping-trips/suggest-items?park=${selectedPark}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedItems(data.items || []);
        // Auto-select all items
        setSelectedItems(new Set((data.items || []).map((i: SuggestedItem) => i.id)));
      }
    } catch (error) {
      console.error('Error fetching suggested items:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const toggleItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(suggestedItems.map(i => i.id)));
  };

  const selectNone = () => {
    setSelectedItems(new Set());
  };

  const handleSubmit = async () => {
    if (!tripDate || !park) {
      toast({
        title: 'Missing fields',
        description: 'Date and park are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/shopping-trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          trip_date: tripDate,
          park,
          notes: notes || undefined,
          item_ids: Array.from(selectedItems),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create trip');
      }

      const { trip } = await response.json();

      toast({
        title: 'Trip created',
        description: `${selectedItems.size} items added to trip`,
      });

      // Reset form
      setName('');
      setTripDate('');
      setPark('');
      setNotes('');
      setSuggestedItems([]);
      setSelectedItems(new Set());

      onTripCreated(trip);
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to create trip',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setName('');
      setTripDate('');
      setPark('');
      setNotes('');
      setSuggestedItems([]);
      setSelectedItems(new Set());
      onOpenChange(false);
    }
  };

  // Group items by store for display
  const itemsByStore: Record<string, SuggestedItem[]> = {};
  suggestedItems.forEach(item => {
    const store = item.store_name || 'Unknown Store';
    if (!itemsByStore[store]) {
      itemsByStore[store] = [];
    }
    itemsByStore[store].push(item);
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Shopping Trip</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trip Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  value={tripDate}
                  onChange={(e) => setTripDate(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="park">Park *</Label>
              <Select value={park} onValueChange={setPark}>
                <SelectTrigger>
                  <SelectValue placeholder="Select park" />
                </SelectTrigger>
                <SelectContent>
                  {['Disney', 'Universal', 'SeaWorld'].map(group => (
                    <div key={group}>
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {group}
                      </div>
                      {PARK_OPTIONS.filter(p => p.group === group).map(p => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Trip Name (optional)</Label>
            <Input
              id="name"
              placeholder={tripDate ? `Trip - ${tripDate}` : 'Auto-generated from date'}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes for this trip..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Items Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Items to Shop</Label>
              {suggestedItems.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-primary hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    type="button"
                    onClick={selectNone}
                    className="text-primary hover:underline"
                  >
                    Select None
                  </button>
                </div>
              )}
            </div>

            {!park ? (
              <div className="py-8 text-center text-muted-foreground border rounded-lg">
                <MapPin className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Select a park to see available items</p>
              </div>
            ) : loadingItems ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Loading items...</p>
              </div>
            ) : suggestedItems.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground border rounded-lg">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>No pending items for this park</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto border rounded-lg p-3">
                {Object.entries(itemsByStore).map(([store, items]) => (
                  <div key={store}>
                    <div className="text-xs font-medium text-muted-foreground mb-1.5">
                      {store} ({items.length})
                    </div>
                    <div className="space-y-1.5">
                      {items.map(item => (
                        <label
                          key={item.id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                            selectedItems.has(item.id)
                              ? 'bg-primary/10'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Checkbox
                            checked={selectedItems.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-xs py-0">
                                {item.category}
                              </Badge>
                              {item.request?.customer && (
                                <span className="flex items-center gap-0.5">
                                  <User className="w-3 h-3" />
                                  {item.request.customer.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {suggestedItems.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedItems.size} of {suggestedItems.length} items selected
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !tripDate || !park} variant="gold">
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
