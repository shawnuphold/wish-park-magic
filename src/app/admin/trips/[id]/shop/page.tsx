"use client";

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BottomSheet } from '@/components/BottomSheet';
import { ImageGallery } from '@/components/ImageGallery';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Camera,
  Check,
  X,
  MapPin,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Package,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Park } from '@/lib/database.types';

interface ShoppingItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  quantity: number;
  status: 'pending' | 'found' | 'not_found' | 'substituted';
  actual_price: number | null;
  reference_images: string[];
  found_images: string[];
  customer_name: string;
  request_id: string;
  locations: { area: string; shop: string | null }[];
}

interface StoreLocation {
  id: string;
  area: string;
  shop: string | null;
}

interface TripData {
  id: string;
  date: string;
  parks: Park[];
  status: string;
}

export default function TripShopPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [trip, setTrip] = useState<TripData | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  // Mark Found Modal
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [foundPrice, setFoundPrice] = useState('');
  const [foundImages, setFoundImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTripData();
  }, [id]);

  const fetchTripData = async () => {
    try {
      // Fetch trip
      const { data: tripData, error: tripError } = await supabase
        .from('shopping_trips')
        .select('id, date, parks, status')
        .eq('id', id)
        .single();

      if (tripError) throw tripError;
      setTrip({
        ...tripData,
        parks: tripData.parks as Park[],
      });

      // Set initial park filter
      if (tripData.parks.length === 1) {
        setSelectedPark(tripData.parks[0] as Park);
      }

      // Fetch items for this trip
      const { data: requestsData } = await supabase
        .from('requests')
        .select(`
          id,
          customer:customers(name),
          items:request_items(
            id, name, description, category, quantity, status,
            actual_price, reference_images, found_images,
            item_locations(
              location:locations(area, shop)
            )
          )
        `)
        .eq('shopping_trip_id', id);

      const allItems: ShoppingItem[] = [];
      requestsData?.forEach((request: any) => {
        request.items?.forEach((item: any) => {
          allItems.push({
            id: item.id,
            name: item.name,
            description: item.description,
            category: item.category,
            quantity: item.quantity,
            status: item.status,
            actual_price: item.actual_price,
            reference_images: item.reference_images || [],
            found_images: item.found_images || [],
            customer_name: request.customer?.name || 'Unknown',
            request_id: request.id,
            locations: item.item_locations?.map((il: any) => ({
              area: il.location?.area || '',
              shop: il.location?.shop,
            })) || [],
          });
        });
      });

      setItems(allItems);
    } catch (error) {
      console.error('Error fetching trip data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shopping list',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get unique areas from items
  const getAreas = () => {
    const areas = new Set<string>();
    items.forEach((item) => {
      item.locations.forEach((loc) => {
        if (loc.area) areas.add(loc.area);
      });
    });
    return Array.from(areas).sort();
  };

  // Filter items by selected area
  const filteredItems = selectedArea
    ? items.filter((item) => item.locations.some((loc) => loc.area === selectedArea))
    : items;

  // Count stats
  const stats = {
    total: items.length,
    found: items.filter((i) => i.status === 'found').length,
    notFound: items.filter((i) => i.status === 'not_found').length,
    pending: items.filter((i) => i.status === 'pending').length,
  };

  // Fetch store locations for current park
  const fetchStoreLocations = async (park: Park) => {
    const { data } = await supabase
      .from('locations')
      .select('id, area, shop')
      .eq('park', park)
      .order('area')
      .order('shop');
    setStoreLocations(data || []);
  };

  // Open mark found modal
  const openMarkFound = (item: ShoppingItem) => {
    setSelectedItem(item);
    setFoundPrice(item.actual_price?.toString() || '');
    setFoundImages(item.found_images || []);
    setSelectedLocationId('');
    if (selectedPark) {
      fetchStoreLocations(selectedPark);
    }
    setShowFoundModal(true);
  };

  // Handle camera capture and upload
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Get presigned URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type || 'image/jpeg',
          folder: 'found-images',
        }),
      });

      if (!response.ok) throw new Error('Failed to get upload URL');

      const { uploadUrl, fileUrl } = await response.json();

      // Upload to S3
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'image/jpeg' },
      });

      setFoundImages((prev) => [...prev, fileUrl]);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload image',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  // Save found item
  const handleSaveFound = async (status: 'found' | 'not_found') => {
    if (!selectedItem) return;
    setSaving(true);

    try {
      const updates: any = {
        status,
        found_at: new Date().toISOString(),
      };

      if (status === 'found') {
        updates.actual_price = foundPrice ? parseFloat(foundPrice) : null;
        updates.found_images = foundImages;
        if (selectedLocationId) {
          updates.found_location_id = selectedLocationId;
        }
      }

      const { error } = await supabase
        .from('request_items')
        .update(updates)
        .eq('id', selectedItem.id);

      if (error) throw error;

      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedItem.id
            ? { ...item, status, actual_price: updates.actual_price, found_images: foundImages }
            : item
        )
      );

      setShowFoundModal(false);
      toast({
        title: status === 'found' ? 'Item found!' : 'Marked not found',
        description: selectedItem.name,
      });
    } catch (error) {
      console.error('Error saving:', error);
      toast({
        title: 'Error',
        description: 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Complete trip
  const completeTrip = async () => {
    try {
      await supabase
        .from('shopping_trips')
        .update({ status: 'completed' })
        .eq('id', id);

      await supabase
        .from('requests')
        .update({ status: 'found' })
        .eq('shopping_trip_id', id);

      toast({
        title: 'Trip completed!',
        description: `Found ${stats.found} of ${stats.total} items`,
      });

      router.push(`/admin/trips/${id}`);
    } catch (error) {
      console.error('Error completing trip:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground mb-4">Trip not found</p>
        <Link href="/admin/trips">
          <Button variant="outline">Back to Trips</Button>
        </Link>
      </div>
    );
  }

  const areas = getAreas();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header - Sticky */}
      <div className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <Link href={`/admin/trips/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="font-semibold">Shopping</h1>
            <p className="text-xs text-muted-foreground">
              {new Date(trip.date + 'T00:00:00').toLocaleDateString()}
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Stats Bar */}
        <div className="flex justify-around py-3 border-t bg-muted/30">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.found}</p>
            <p className="text-xs text-muted-foreground">Found</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{stats.notFound}</p>
            <p className="text-xs text-muted-foreground">Not Found</p>
          </div>
        </div>

        {/* Park Filter */}
        {trip.parks.length > 1 && (
          <div className="flex gap-2 p-3 overflow-x-auto border-t">
            <Button
              variant={selectedPark === null ? 'gold' : 'outline'}
              size="sm"
              onClick={() => setSelectedPark(null)}
            >
              All
            </Button>
            {trip.parks.map((park) => (
              <Button
                key={park}
                variant={selectedPark === park ? 'gold' : 'outline'}
                size="sm"
                onClick={() => setSelectedPark(park)}
                className="capitalize"
              >
                {park}
              </Button>
            ))}
          </div>
        )}

        {/* Area Filter */}
        {areas.length > 0 && (
          <div className="flex gap-2 p-3 overflow-x-auto border-t">
            <Button
              variant={selectedArea === null ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedArea(null)}
            >
              All Areas
            </Button>
            {areas.map((area) => (
              <Button
                key={area}
                variant={selectedArea === area ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedArea(area)}
              >
                {area}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Shopping List */}
      <div className="p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No items to shop</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => item.status === 'pending' && openMarkFound(item)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                item.status === 'pending' && "bg-card active:scale-[0.98] cursor-pointer",
                item.status === 'found' && "bg-green-500/10 border-green-500/30",
                item.status === 'not_found' && "bg-red-500/10 border-red-500/30 opacity-60"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  item.status === 'pending' && "bg-yellow-500/20",
                  item.status === 'found' && "bg-green-500/20",
                  item.status === 'not_found' && "bg-red-500/20"
                )}>
                  {item.status === 'found' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {item.status === 'not_found' && <XCircle className="w-5 h-5 text-red-600" />}
                  {item.status === 'pending' && <Package className="w-5 h-5 text-yellow-600" />}
                </div>

                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg leading-tight">{item.name}</h3>
                      <p className="text-sm text-muted-foreground">for {item.customer_name}</p>
                    </div>
                    {item.quantity > 1 && (
                      <Badge variant="secondary">x{item.quantity}</Badge>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  )}

                  {/* Location hints */}
                  {item.locations.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {item.locations.map((loc, i) => (
                        <span key={i}>
                          {loc.shop ? `${loc.shop} (${loc.area})` : loc.area}
                          {i < item.locations.length - 1 && ', '}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Reference images preview */}
                  {item.reference_images.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {item.reference_images.slice(0, 3).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      ))}
                      {item.reference_images.length > 3 && (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          +{item.reference_images.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Arrow for pending items */}
                {item.status === 'pending' && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Complete Trip FAB */}
      {stats.pending === 0 && stats.found > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-50">
          <Button
            variant="gold"
            size="lg"
            className="w-full h-14 text-lg shadow-lg"
            onClick={completeTrip}
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Complete Trip ({stats.found}/{stats.total} found)
          </Button>
        </div>
      )}

      {/* Mark Found Bottom Sheet */}
      <BottomSheet
        isOpen={showFoundModal}
        onClose={() => setShowFoundModal(false)}
        title={selectedItem?.name || 'Mark Found'}
      >
        {selectedItem && (
          <div className="space-y-6 pb-6">
            {/* Customer & Description */}
            <div>
              <p className="text-sm text-muted-foreground">for {selectedItem.customer_name}</p>
              {selectedItem.description && (
                <p className="text-sm mt-1">{selectedItem.description}</p>
              )}
            </div>

            {/* Reference Images */}
            {selectedItem.reference_images.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Customer Reference
                </p>
                <ImageGallery images={selectedItem.reference_images} thumbnailSize="lg" />
              </div>
            )}

            {/* Camera Capture */}
            <div>
              <p className="text-sm font-medium mb-2">Take Photo</p>
              <label className={cn(
                "flex items-center justify-center gap-3 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors",
                uploadingImage ? "bg-muted" : "hover:bg-muted/50 active:bg-muted"
              )}>
                {uploadingImage ? (
                  <Loader2 className="w-8 h-8 animate-spin text-gold" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 text-gold" />
                    <span className="font-medium">Tap to capture</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCameraCapture}
                  className="hidden"
                  disabled={uploadingImage}
                />
              </label>

              {/* Captured photos */}
              {foundImages.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {foundImages.map((url, i) => (
                    <div key={i} className="relative">
                      <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                      <button
                        onClick={() => setFoundImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Price */}
            <div>
              <p className="text-sm font-medium mb-2">Actual Price</p>
              <Input
                type="number"
                step="0.01"
                value={foundPrice}
                onChange={(e) => setFoundPrice(e.target.value)}
                placeholder="0.00"
                className="text-lg h-12"
              />
            </div>

            {/* Location */}
            {storeLocations.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Found at Store</p>
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="w-full h-12 px-3 rounded-md border bg-background"
                >
                  <option value="">Select location...</option>
                  {storeLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.shop ? `${loc.shop} (${loc.area})` : loc.area}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="h-14"
                onClick={() => handleSaveFound('not_found')}
                disabled={saving}
              >
                <XCircle className="w-5 h-5 mr-2 text-red-500" />
                Not Found
              </Button>
              <Button
                variant="gold"
                size="lg"
                className="h-14"
                onClick={() => handleSaveFound('found')}
                disabled={saving || (foundImages.length === 0 && !foundPrice)}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Found!
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
