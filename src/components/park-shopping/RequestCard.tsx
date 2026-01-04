"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ImageLightbox } from './ImageLightbox';
import { MarkFoundForm } from './MarkFoundForm';
import { MarkNotFoundForm } from './MarkNotFoundForm';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  RotateCcw,
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import type { NotFoundReason } from '@/lib/park-shopping-config';

// Check if URL is from our S3 bucket
const isS3Url = (url: string) => url.includes('enchantedbucket.s3');

// Fetch signed URL for S3 images
async function getSignedUrl(url: string): Promise<string> {
  if (!isS3Url(url)) return url;

  try {
    const response = await fetch(`/api/image?url=${encodeURIComponent(url)}`);
    if (!response.ok) return url;
    const data = await response.json();
    return data.signedUrl || url;
  } catch {
    return url;
  }
}

export interface RequestItemData {
  id: string;
  name: string;
  description: string | null;
  reference_image_url: string | null;
  reference_images: string[] | null;
  found_image_url: string | null;
  found_images: string[] | null;
  quantity: number;
  estimated_price: number | null;
  actual_price: number | null;
  status: 'pending' | 'found' | 'not_found' | 'substituted';
  store_name: string | null;
  notes: string | null;
  category: string;
  created_at: string;
  request: {
    id: string;
    notes: string | null;
    created_at: string;
    customer: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      facebook_name: string | null;
    };
  };
  // For not found items
  not_found_reason?: string;
}

interface RequestCardProps {
  item: RequestItemData;
  onMarkFound: (itemId: string, data: {
    quantity_found: number;
    actual_price: number;
    store_name?: string;
    found_images?: string[];
    notes?: string;
  }) => Promise<void>;
  onMarkNotFound: (itemId: string, data: {
    reason: NotFoundReason;
    notes?: string;
  }) => Promise<void>;
  onReset: (itemId: string) => Promise<void>;
}

export function RequestCard({ item, onMarkFound, onMarkNotFound, onReset }: RequestCardProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [showFoundForm, setShowFoundForm] = useState(false);
  const [showNotFoundForm, setShowNotFoundForm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
  const [signedImages, setSignedImages] = useState<string[]>([]);
  const [loadingImage, setLoadingImage] = useState(true);

  const customer = item.request.customer;

  // Get image URL: prioritize found images for found items, then reference images
  const getRawImageUrl = () => {
    if (item.status === 'found') {
      // Check found_images array first, then found_image_url
      if (item.found_images && item.found_images.length > 0) {
        return item.found_images[0];
      }
      if (item.found_image_url) {
        return item.found_image_url;
      }
    }
    // Fall back to reference images
    if (item.reference_images && item.reference_images.length > 0) {
      return item.reference_images[0];
    }
    return item.reference_image_url;
  };

  const rawImageUrl = getRawImageUrl();

  // Collect all images for lightbox
  const rawImages: string[] = [];
  if (item.reference_images) rawImages.push(...item.reference_images);
  if (item.reference_image_url && !item.reference_images?.includes(item.reference_image_url)) {
    rawImages.push(item.reference_image_url);
  }
  if (item.found_images) rawImages.push(...item.found_images);
  if (item.found_image_url && !item.found_images?.includes(item.found_image_url)) {
    rawImages.push(item.found_image_url);
  }

  // Fetch signed URLs for S3 images
  useEffect(() => {
    const fetchSignedUrls = async () => {
      setLoadingImage(true);

      // Get signed URL for main image
      if (rawImageUrl) {
        const signed = await getSignedUrl(rawImageUrl);
        setSignedImageUrl(signed);
      } else {
        setSignedImageUrl(null);
      }

      // Get signed URLs for all images (for lightbox)
      if (rawImages.length > 0) {
        const signedUrls = await Promise.all(rawImages.map(getSignedUrl));
        setSignedImages(signedUrls);
      } else {
        setSignedImages([]);
      }

      setLoadingImage(false);
    };

    fetchSignedUrls();
  }, [item.id, rawImageUrl, rawImages.length]);

  const handleReset = async () => {
    setResetting(true);
    try {
      await onReset(item.id);
    } finally {
      setResetting(false);
    }
  };

  const getStatusBadge = () => {
    switch (item.status) {
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">PENDING</Badge>;
      case 'found':
        return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">FOUND</Badge>;
      case 'not_found':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">NOT FOUND</Badge>;
      case 'substituted':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">SUBSTITUTED</Badge>;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Build details string (size, qty, color, etc.)
  const detailParts: string[] = [];
  if (item.quantity > 1) detailParts.push(`Qty: ${item.quantity}`);
  if (item.category) detailParts.push(item.category.replace('_', ' '));
  const detailsString = detailParts.join(' • ');

  return (
    <>
      <Card className={cn(
        "overflow-hidden",
        item.status === 'found' && "ring-2 ring-emerald-500",
        item.status === 'not_found' && "ring-2 ring-red-500 opacity-75"
      )}>
        {/* Large Image - 70% of card */}
        <div
          className="relative aspect-[4/3] bg-muted cursor-pointer"
          onClick={() => signedImages.length > 0 && setShowLightbox(true)}
        >
          {loadingImage ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : signedImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={signedImageUrl}
              alt={item.name}
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No Image
            </div>
          )}
          {/* Tap to zoom indicator */}
          {signedImageUrl && !loadingImage && (
            <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
              Tap to zoom
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="p-4 space-y-3">
          {/* Title and status row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-lg leading-tight">
                {item.status === 'found' && <span className="text-emerald-600">✓ </span>}
                {item.status === 'not_found' && <span className="text-red-500">✗ </span>}
                {item.name}
              </h3>
              {detailsString && (
                <p className="text-sm text-muted-foreground mt-0.5">{detailsString}</p>
              )}
            </div>
            {getStatusBadge()}
          </div>

          {/* Found item details */}
          {item.status === 'found' && item.actual_price && (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <span className="text-lg font-bold">
                ${item.actual_price.toFixed(2)} each
              </span>
              {item.quantity > 1 && (
                <span className="text-sm">
                  = ${(item.actual_price * item.quantity).toFixed(2)} total
                </span>
              )}
            </div>
          )}

          {/* Not found reason */}
          {item.status === 'not_found' && item.not_found_reason && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Reason: {item.not_found_reason.replace('_', ' ')}
            </div>
          )}

          {/* Store location if found */}
          {item.status === 'found' && item.store_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              Found at: {item.store_name}
            </div>
          )}

          {/* Customer info box */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{customer.name}</span>
              {customer.facebook_name && customer.facebook_name !== customer.name && (
                <span className="text-muted-foreground">({customer.facebook_name})</span>
              )}
            </div>
            {customer.email && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${customer.email}`} className="hover:underline truncate">
                  {customer.email}
                </a>
              </div>
            )}
            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <a href={`tel:${customer.phone}`} className="hover:underline">
                  {customer.phone}
                </a>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="w-3 h-3" />
              Requested: {formatDate(item.created_at)}
            </div>
          </div>

          {/* Request notes */}
          {(item.request.notes || item.notes) && (
            <div className="flex items-start gap-2 text-sm bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-200 rounded-lg p-3">
              <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="italic">{item.notes || item.request.notes}</p>
            </div>
          )}

          {/* Action buttons */}
          {item.status === 'pending' && !showFoundForm && !showNotFoundForm && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setShowFoundForm(true)}
                className="flex-1 h-14 text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-5 h-5 mr-2" />
                FOUND
              </Button>
              <Button
                onClick={() => setShowNotFoundForm(true)}
                variant="outline"
                className="flex-1 h-14 text-base font-semibold border-2"
              >
                <X className="w-5 h-5 mr-2" />
                NOT FOUND
              </Button>
            </div>
          )}

          {/* Reset button for found/not found items */}
          {(item.status === 'found' || item.status === 'not_found') && (
            <Button
              onClick={handleReset}
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={resetting}
            >
              <RotateCcw className={cn("w-4 h-4 mr-2", resetting && "animate-spin")} />
              Reset to Pending
            </Button>
          )}
        </div>

        {/* Inline forms */}
        {showFoundForm && (
          <MarkFoundForm
            itemId={item.id}
            itemName={item.name}
            maxQuantity={item.quantity}
            currentStore={item.store_name}
            onSubmit={async (data) => {
              await onMarkFound(item.id, data);
              setShowFoundForm(false);
            }}
            onCancel={() => setShowFoundForm(false)}
          />
        )}

        {showNotFoundForm && (
          <MarkNotFoundForm
            itemId={item.id}
            itemName={item.name}
            onSubmit={async (data) => {
              await onMarkNotFound(item.id, data);
              setShowNotFoundForm(false);
            }}
            onCancel={() => setShowNotFoundForm(false)}
          />
        )}
      </Card>

      {/* Lightbox */}
      {showLightbox && signedImages.length > 0 && (
        <ImageLightbox
          images={signedImages}
          initialIndex={0}
          onClose={() => setShowLightbox(false)}
        />
      )}
    </>
  );
}
