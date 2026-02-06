"use client";

import { useEffect, useState, useRef, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BottomSheet } from '@/components/BottomSheet';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Camera,
  Check,
  X,
  MapPin,
  User,
  Package,
  ChevronDown,
  ShoppingBag,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
type Park = 'disney' | 'universal' | 'seaworld';
type ItemCategory = 'clothing' | 'accessories' | 'toys' | 'home' | 'food' | 'collectibles' | 'other';
import { ImageGallery } from '@/components/ImageGallery';

interface ItemLocation {
  area: string;
  shop: string | null;
  is_confirmed: boolean;
}

interface ShoppingItem {
  id: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  park: Park;
  quantity: number;
  status: 'pending' | 'found' | 'not_found' | 'substituted';
  actual_price: number | null;
  found_image_url: string | null;
  reference_images: string[];
  found_images: string[];
  request_id: string;
  customer_name: string;
  locations: ItemLocation[];
}

interface StoreLocation {
  id: string;
  area: string;
  shop: string | null;
}

const parkLabels: Record<Park, string> = {
  disney: 'Disney World',
  universal: 'Universal Orlando',
  seaworld: 'SeaWorld',
};

const parkColors: Record<Park, string> = {
  disney: 'bg-blue-500',
  universal: 'bg-purple-500',
  seaworld: 'bg-cyan-500',
};

function ShoppingListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Get initial park from URL query param
  const initialPark = searchParams.get('park') as Park | null;
  const [selectedPark, setSelectedPark] = useState<Park | 'all'>(
    initialPark && ['disney', 'universal', 'seaworld'].includes(initialPark) ? initialPark : 'all'
  );
  const [showFoundModal, setShowFoundModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null);
  const [foundPrice, setFoundPrice] = useState('');
  const [foundImage, setFoundImage] = useState<string | null>(null);
  const [foundImages, setFoundImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    try {
      // Get all items from requests with status = 'shopping'
      const { data, error } = await supabase
        .from('request_items')
        .select(`
          id,
          name,
          description,
          category,
          park,
          quantity,
          status,
          actual_price,
          found_image_url,
          reference_images,
          found_images,
          request_id,
          request:requests!inner(
            id,
            status,
            customer:customers(name)
          ),
          item_locations(
            is_confirmed,
            location:locations(area, shop)
          )
        `)
        .eq('request.status', 'shopping')
        .order('park', { ascending: true });

      if (error) throw error;

      setItems(
        data?.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          category: item.category as ItemCategory,
          park: item.park as Park,
          quantity: item.quantity,
          status: item.status as ShoppingItem['status'],
          actual_price: item.actual_price,
          found_image_url: item.found_image_url,
          reference_images: (item.reference_images as string[]) || [],
          found_images: (item.found_images as string[]) || [],
          request_id: item.request_id,
          customer_name: (item.request as any)?.customer?.name || 'Unknown',
          locations: (item.item_locations as any[])?.map((il) => ({
            area: il.location?.area || '',
            shop: il.location?.shop,
            is_confirmed: il.is_confirmed,
          })) || [],
        })) || []
      );
    } catch (error) {
      console.error('Error fetching shopping items:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Fetch store locations when item is selected
  const fetchStoreLocations = async (park: Park) => {
    const { data } = await supabase
      .from('locations')
      .select('id, area, shop')
      .eq('park', park)
      .order('area')
      .order('shop');
    setStoreLocations(data || []);
  };

  const handleMarkFound = (item: ShoppingItem) => {
    setSelectedItem(item);
    setFoundPrice(item.actual_price?.toString() || '');
    setFoundImage(item.found_image_url);
    setFoundImages(item.found_images || []);
    setSelectedLocationId('');
    fetchStoreLocations(item.park);
    setShowFoundModal(true);
  };

  const handleMarkNotFound = async (item: ShoppingItem) => {
    try {
      const { error } = await supabase
        .from('request_items')
        .update({ status: 'not_found' })
        .eq('id', item.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'not_found' as const } : i))
      );

      toast({
        title: 'Marked as Not Found',
        description: `${item.name} marked as not available.`,
      });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item status.',
        variant: 'destructive',
      });
    }
  };

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  // Compress image before upload
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const maxDim = 1920;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = (height / width) * maxDim;
              width = maxDim;
            } else {
              width = (width / height) * maxDim;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItem) return;

    setUploadingImage(true);

    try {
      // Compress image
      const compressed = await compressImage(file);

      // Get presigned URL from our API
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: 'image/jpeg',
          folder: 'found-images',
        }),
      });

      if (!response.ok) throw new Error('Failed to get upload URL');

      const { uploadUrl, fileUrl } = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: compressed,
        headers: { 'Content-Type': 'image/jpeg' },
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload');

      // Add to found images array
      setFoundImages((prev) => [...prev, fileUrl]);
      setFoundImage(fileUrl);

      toast({
        title: 'Photo uploaded',
        description: 'Image saved successfully.',
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUploadingImage(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSaveFound = async () => {
    if (!selectedItem) return;

    try {
      const updateData: Record<string, unknown> = {
        status: 'found',
        actual_price: foundPrice ? parseFloat(foundPrice) : null,
        found_image_url: foundImage,
        found_images: foundImages,
        found_at: new Date().toISOString(),
      };

      // Add location if selected
      if (selectedLocationId) {
        updateData.found_location_id = selectedLocationId;
      }

      const { error } = await supabase
        .from('request_items')
        .update(updateData)
        .eq('id', selectedItem.id);

      if (error) throw error;

      setItems((prev) =>
        prev.map((i) =>
          i.id === selectedItem.id
            ? {
                ...i,
                status: 'found' as const,
                actual_price: foundPrice ? parseFloat(foundPrice) : null,
                found_image_url: foundImage,
                found_images: foundImages,
              }
            : i
        )
      );

      toast({
        title: 'Item Found!',
        description: `${selectedItem.name} marked as found.`,
      });

      setShowFoundModal(false);
      setSelectedItem(null);
      setFoundPrice('');
      setFoundImage(null);
      setFoundImages([]);
      setSelectedLocationId('');
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save item.',
        variant: 'destructive',
      });
    }
  };

  const filteredItems = items.filter(
    (item) => selectedPark === 'all' || item.park === selectedPark
  );

  const pendingItems = filteredItems.filter((i) => i.status === 'pending');
  const foundItems = filteredItems.filter((i) => i.status === 'found');
  const notFoundItems = filteredItems.filter((i) => i.status === 'not_found');

  const parks: Park[] = ['disney', 'universal', 'seaworld'];
  const activeParkCounts = parks.reduce((acc, park) => {
    acc[park] = items.filter((i) => i.park === park && i.status === 'pending').length;
    return acc;
  }, {} as Record<Park, number>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-gold" />
            Shopping List
          </h1>
          <p className="text-sm text-muted-foreground">Park Mode - Big buttons for easy tapping</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchItems}>
          <RefreshCw className="w-5 h-5" />
        </Button>
      </div>

      {/* Park Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
        <button
          onClick={() => setSelectedPark('all')}
          className={cn(
            "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors",
            selectedPark === 'all'
              ? "bg-gold text-midnight"
              : "bg-muted text-muted-foreground"
          )}
        >
          All Parks
          <span className="ml-1 opacity-70">({pendingItems.length})</span>
        </button>
        {parks.map((park) => (
          <button
            key={park}
            onClick={() => setSelectedPark(park)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2",
              selectedPark === park
                ? "bg-gold text-midnight"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", parkColors[park])} />
            {park.charAt(0).toUpperCase() + park.slice(1)}
            {activeParkCounts[park] > 0 && (
              <span className="opacity-70">({activeParkCounts[park]})</span>
            )}
          </button>
        ))}
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Package className="w-4 h-4 text-yellow-500" />
            <span className="font-medium">{pendingItems.length}</span> pending
          </span>
          <span className="flex items-center gap-1">
            <Check className="w-4 h-4 text-green-500" />
            <span className="font-medium">{foundItems.length}</span> found
          </span>
          <span className="flex items-center gap-1">
            <X className="w-4 h-4 text-red-500" />
            <span className="font-medium">{notFoundItems.length}</span> N/A
          </span>
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No items to shop for</p>
          <p className="text-sm text-muted-foreground mt-1">
            Set request status to "Shopping" to see items here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending Items */}
          {pendingItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4">
                  {/* Item Header */}
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0",
                        "bg-yellow-500/10"
                      )}
                    >
                      <Package className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {item.customer_name}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.park}
                        </Badge>
                        {item.quantity > 1 && (
                          <Badge variant="secondary">x{item.quantity}</Badge>
                        )}
                      </div>
                      {/* Locations */}
                      {item.locations.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.locations.map((loc, idx) => (
                            <Badge
                              key={idx}
                              variant="outline"
                              className={cn(
                                "text-xs",
                                loc.is_confirmed && "bg-green-500/10 border-green-300"
                              )}
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              {loc.shop ? `${loc.area} - ${loc.shop}` : loc.area}
                              {loc.is_confirmed && <Check className="w-3 h-3 ml-1 text-green-600" />}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons - BIG for park mode */}
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 h-14 text-base"
                      onClick={() => handleMarkFound(item)}
                    >
                      <Camera className="w-5 h-5 mr-2" />
                      Found
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="flex-1 h-14 text-base text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleMarkNotFound(item)}
                    >
                      <X className="w-5 h-5 mr-2" />
                      Not Available
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Found Items */}
          {foundItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Check className="w-4 h-4 text-green-500" />
                  Found ({foundItems.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {foundItems.map((item) => (
                <Card key={item.id} className="overflow-hidden bg-green-500/5 border-green-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.customer_name}
                          {item.actual_price && ` • $${item.actual_price.toFixed(2)}`}
                        </p>
                      </div>
                      {item.found_image_url && (
                        <img
                          src={item.found_image_url}
                          alt={item.name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {/* Not Found Items */}
          {notFoundItems.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <X className="w-4 h-4 text-red-500" />
                  Not Available ({notFoundItems.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {notFoundItems.map((item) => (
                <Card key={item.id} className="overflow-hidden bg-red-500/5 border-red-500/20 opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <X className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground line-through">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.customer_name}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      )}

      {/* Found Item Modal */}
      <BottomSheet
        isOpen={showFoundModal}
        onClose={() => {
          setShowFoundModal(false);
          setSelectedItem(null);
          setFoundPrice('');
          setFoundImage(null);
          setFoundImages([]);
          setSelectedLocationId('');
        }}
        title="Mark as Found"
      >
        <div className="p-4 space-y-5 max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              {/* Item Info */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedItem.name}</p>
                <p className="text-sm text-muted-foreground">{selectedItem.customer_name}</p>
                {selectedItem.description && (
                  <p className="text-xs text-muted-foreground mt-1">{selectedItem.description}</p>
                )}
              </div>

              {/* Reference Images - What customer wants */}
              {selectedItem.reference_images && selectedItem.reference_images.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" />
                    Customer Reference
                  </p>
                  <ImageGallery
                    images={selectedItem.reference_images}
                    thumbnailSize="md"
                  />
                </div>
              )}

              {/* Photo Capture */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Take a photo of the item
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Camera button - large and prominent */}
                <button
                  onClick={handleCameraCapture}
                  disabled={uploadingImage}
                  className={cn(
                    "w-full h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-colors",
                    uploadingImage
                      ? "border-gold bg-gold/10 cursor-wait"
                      : "border-muted-foreground/30 hover:bg-muted/50 active:bg-muted"
                  )}
                >
                  {uploadingImage ? (
                    <>
                      <Loader2 className="w-8 h-8 text-gold animate-spin" />
                      <span className="text-sm text-gold">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Tap to take photo</span>
                    </>
                  )}
                </button>

                {/* Uploaded images */}
                {foundImages.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">
                      Photos taken ({foundImages.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {foundImages.map((url, idx) => (
                        <div key={url} className="relative w-20 h-20 group">
                          <img
                            src={url}
                            alt={`Found ${idx + 1}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          <button
                            onClick={() => setFoundImages(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Store Location */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  Where did you find it?
                </p>
                <Select
                  value={selectedLocationId}
                  onValueChange={setSelectedLocationId}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select store location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {storeLocations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.shop ? `${loc.area} - ${loc.shop}` : loc.area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Price Input */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Actual price
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={foundPrice}
                    onChange={(e) => setFoundPrice(e.target.value)}
                    className="pl-7 h-12 text-lg"
                  />
                </div>
              </div>

              {/* Save Button */}
              <Button
                variant="gold"
                size="lg"
                className="w-full h-14 text-base"
                onClick={handleSaveFound}
                disabled={uploadingImage}
              >
                <Check className="w-5 h-5 mr-2" />
                Mark as Found
              </Button>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

export default function ShoppingListPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    }>
      <ShoppingListContent />
    </Suspense>
  );
}
