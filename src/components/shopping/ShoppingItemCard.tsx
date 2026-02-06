'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, X, MapPin, ImageIcon, Undo2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MarkFoundForm } from './MarkFoundForm';
import { ImageViewer } from './ImageViewer';

export interface ShoppingItem {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  park?: string | null;
  specific_park?: string | null;  // e.g., "Magic Kingdom", "EPCOT"
  store_name?: string | null;
  land_name?: string | null;
  quantity?: number;
  quantity_found?: number;
  size?: string | null;
  color?: string | null;
  variant?: string | null;
  customer_notes?: string | null;
  estimated_price?: number | null;
  actual_price?: number | null;
  status: string;
  reference_image_url?: string | null;
  found_image_url?: string | null;
  notes?: string | null;
  not_found_reason?: string | null;
  created_at: string;
  alsoAt?: string[];
  customerName: string;
  requestId?: string;
}

interface ShoppingItemCardProps {
  item: ShoppingItem;
  onUpdate: () => void;
}

export function ShoppingItemCard({ item, onUpdate }: ShoppingItemCardProps) {
  const [showFoundForm, setShowFoundForm] = useState(false);
  const [showNotFoundOptions, setShowNotFoundOptions] = useState(false);
  const [markingNotFound, setMarkingNotFound] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const isPending = item.status === 'pending';
  const isFound = item.status === 'found';
  const isNotFound = item.status === 'not_found';

  const handleNotFound = async (reason: string) => {
    setMarkingNotFound(true);
    try {
      const response = await fetch(`/api/shopping/items/${item.id}/not-found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (response.ok) {
        onUpdate();
      } else {
        toast.error('Failed to mark item');
      }
    } catch (error) {
      console.error('Error marking not found:', error);
      toast.error('Failed to mark item');
    } finally {
      setMarkingNotFound(false);
      setShowNotFoundOptions(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset this item to pending?')) {
      return;
    }
    setResetting(true);
    try {
      const response = await fetch(`/api/shopping/items/${item.id}/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        onUpdate();
      } else {
        toast.error('Failed to reset item');
      }
    } catch (error) {
      console.error('Error resetting item:', error);
      toast.error('Failed to reset item');
    } finally {
      setResetting(false);
    }
  };

  // Get the display image (found image for found items, reference for others)
  const displayImage = isFound && item.found_image_url ? item.found_image_url : item.reference_image_url;

  // Build details string
  const details: string[] = [];
  if (item.size) details.push(`Size: ${item.size}`);
  if ((item.quantity || 1) > 1) details.push(`Qty: ${item.quantity}`);
  if (item.color) details.push(item.color);
  if (item.variant) details.push(item.variant);

  return (
    <div className={`
      rounded-2xl overflow-hidden shadow-md
      ${isFound ? 'ring-2 ring-green-400 bg-green-50' : 'bg-white'}
      ${isNotFound ? 'opacity-60 bg-gray-50' : ''}
    `}>
      {/* BIG IMAGE - Takes ~60% of card */}
      <div
        className="relative w-full bg-gray-100 cursor-pointer"
        style={{ aspectRatio: '4/3' }}
        onClick={() => displayImage && setShowImageViewer(true)}
      >
        {displayImage ? (
          <Image
            src={displayImage}
            alt={item.name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, 400px"
            priority
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <ImageIcon className="w-16 h-16 mb-2" />
            <span className="text-sm">No image</span>
          </div>
        )}

        {/* Status overlay for found/not found */}
        {isFound && (
          <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            Found
          </div>
        )}
        {isNotFound && (
          <div className="absolute top-3 left-3 bg-red-500 text-white px-3 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1.5">
            <X className="w-4 h-4" />
            {item.not_found_reason === 'out_of_stock' ? 'Out of Stock' :
             item.not_found_reason === 'discontinued' ? 'Discontinued' : 'Not Found'}
          </div>
        )}

        {/* Multi-park badge */}
        {item.alsoAt && item.alsoAt.length > 0 && isPending && (
          <div className="absolute bottom-3 left-3 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
            Also at {item.alsoAt.length} other {item.alsoAt.length === 1 ? 'park' : 'parks'}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-4">
        {/* Item Name */}
        <h3 className="text-lg font-semibold leading-tight mb-2">
          {item.name}
        </h3>

        {/* Details Row */}
        {details.length > 0 && (
          <p className="text-base text-gray-600 mb-2">
            {details.join('  •  ')}
          </p>
        )}

        {/* Customer */}
        <div className="flex items-center gap-1.5 text-gray-500 mb-1">
          <User className="w-4 h-4" />
          <span className="text-sm">{item.customerName}</span>
        </div>

        {/* Store location - show specific park, land, and store */}
        {(item.specific_park || item.store_name || item.land_name) && (
          <div className="flex items-center gap-1.5 text-gray-500">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">
              {[item.specific_park, item.land_name, item.store_name]
                .filter(Boolean)
                .join(' • ')}
            </span>
          </div>
        )}

        {/* Customer Notes */}
        {item.customer_notes && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
            <span className="font-medium">Note:</span> {item.customer_notes}
          </div>
        )}

        {/* Notes from general notes field */}
        {item.notes && !item.customer_notes && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl text-sm text-gray-600">
            {item.notes}
          </div>
        )}

        {/* Found state - show price and reset */}
        {isFound && (
          <div className="mt-4 flex items-center justify-between">
            <div className="text-lg font-bold text-green-600">
              ${item.actual_price?.toFixed(2)}
              {(item.quantity || 1) > 1 && (
                <span className="text-sm font-normal text-gray-500 ml-1">
                  each ({item.quantity_found || item.quantity} of {item.quantity})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={handleReset}
              disabled={resetting}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Not found state - show reset */}
        {isNotFound && (
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={handleReset}
              disabled={resetting}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Action Buttons - Only for pending items */}
        {isPending && !showFoundForm && !showNotFoundOptions && (
          <div className="flex gap-3 mt-4">
            <Button
              className="flex-1 min-h-[56px] text-base font-semibold rounded-xl bg-green-500 hover:bg-green-600"
              onClick={() => setShowFoundForm(true)}
            >
              <Check className="w-5 h-5 mr-2" />
              Found
            </Button>
            <Button
              variant="outline"
              className="flex-1 min-h-[56px] text-base font-semibold rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-100"
              onClick={() => setShowNotFoundOptions(true)}
            >
              <X className="w-5 h-5 mr-2" />
              Not Here
            </Button>
          </div>
        )}

        {/* Mark Found Form */}
        {showFoundForm && (
          <MarkFoundForm
            item={item}
            onSave={() => {
              setShowFoundForm(false);
              onUpdate();
            }}
            onCancel={() => setShowFoundForm(false)}
          />
        )}

        {/* Not Found Options */}
        {showNotFoundOptions && (
          <div className="mt-4 space-y-3">
            <p className="text-base font-medium">Why not found?</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="h-12 text-sm"
                disabled={markingNotFound}
                onClick={() => handleNotFound('out_of_stock')}
              >
                Out of Stock
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm"
                disabled={markingNotFound}
                onClick={() => handleNotFound('cant_find')}
              >
                Can&apos;t Find
              </Button>
              <Button
                variant="outline"
                className="h-12 text-sm"
                disabled={markingNotFound}
                onClick={() => handleNotFound('discontinued')}
              >
                Discontinued
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full h-10"
              onClick={() => setShowNotFoundOptions(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && displayImage && (
        <ImageViewer
          src={displayImage}
          alt={item.name}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}
