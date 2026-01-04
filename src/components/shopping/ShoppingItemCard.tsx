'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Check, X, MapPin, ImageIcon, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkFoundForm } from './MarkFoundForm';
import { ImageViewer } from './ImageViewer';

export interface ShoppingItem {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  park?: string | null;
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
      }
    } catch (error) {
      console.error('Error marking not found:', error);
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
      }
    } catch (error) {
      console.error('Error resetting item:', error);
    } finally {
      setResetting(false);
    }
  };

  // Format date
  const requestDate = new Date(item.created_at).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
  });

  return (
    <div className={`
      rounded-xl border bg-card overflow-hidden
      ${isFound ? 'border-green-200 bg-green-50/50' : ''}
      ${isNotFound ? 'border-red-200 bg-red-50/50 opacity-75' : ''}
    `}>
      <div className="p-4">
        {/* Image and Info Row */}
        <div className="flex gap-3">
          {/* Image */}
          <div
            className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted cursor-pointer"
            onClick={() => item.reference_image_url && setShowImageViewer(true)}
          >
            {item.reference_image_url ? (
              <Image
                src={item.reference_image_url}
                alt={item.name}
                fill
                className="object-cover"
                sizes="80px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-base leading-tight line-clamp-2">
              {item.name}
            </h3>

            {/* Size / Qty / Color */}
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-sm text-muted-foreground mt-1">
              {item.size && <span>Size: {item.size}</span>}
              {(item.quantity || 1) > 1 && (
                <span>Qty: {item.quantity}</span>
              )}
              {item.color && <span>{item.color}</span>}
              {item.variant && <span>{item.variant}</span>}
            </div>

            {/* Customer and Date */}
            <div className="text-sm text-muted-foreground mt-1">
              {item.customerName} &bull; {requestDate}
            </div>

            {/* Multi-park badge */}
            {item.alsoAt && item.alsoAt.length > 0 && (
              <div className="flex items-center gap-1 mt-1.5 text-xs text-blue-600">
                <MapPin className="w-3 h-3" />
                <span>Also at: {item.alsoAt.slice(0, 2).join(', ')}</span>
                {item.alsoAt.length > 2 && <span>+{item.alsoAt.length - 2}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Customer Notes */}
        {item.customer_notes && (
          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <span className="font-medium">Note:</span> {item.customer_notes}
          </div>
        )}

        {/* Notes from general notes field */}
        {item.notes && !item.customer_notes && (
          <div className="mt-3 p-2 bg-muted rounded-lg text-sm text-muted-foreground">
            {item.notes}
          </div>
        )}

        {/* Status badges for completed items */}
        {isFound && (
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <Check className="w-3 h-3 mr-1" />
                Found
              </Badge>
              {item.actual_price && (
                <span className="text-sm font-medium text-green-700">
                  ${item.actual_price.toFixed(2)}
                </span>
              )}
              {item.quantity_found && item.quantity_found < (item.quantity || 1) && (
                <span className="text-xs text-muted-foreground">
                  ({item.quantity_found} of {item.quantity})
                </span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
              onClick={handleReset}
              disabled={resetting}
            >
              <Undo2 className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {isNotFound && (
          <div className="mt-3 flex items-center justify-between">
            <Badge className="bg-red-100 text-red-700 border-red-200">
              <X className="w-3 h-3 mr-1" />
              {item.not_found_reason === 'out_of_stock' ? 'Out of Stock' :
               item.not_found_reason === 'discontinued' ? 'Discontinued' : 'Not Found'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground hover:text-foreground"
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
          <div className="flex gap-2 mt-4">
            <Button
              variant="default"
              className="flex-1 h-12 bg-green-600 hover:bg-green-700"
              onClick={() => setShowFoundForm(true)}
            >
              <Check className="w-5 h-5 mr-2" />
              Found
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-12 border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => setShowNotFoundOptions(true)}
            >
              <X className="w-5 h-5 mr-2" />
              Not Found
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
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium mb-2">Why not found?</p>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10"
                disabled={markingNotFound}
                onClick={() => handleNotFound('out_of_stock')}
              >
                Out of Stock
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10"
                disabled={markingNotFound}
                onClick={() => handleNotFound('cant_find')}
              >
                Can't Find
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-10"
                disabled={markingNotFound}
                onClick={() => handleNotFound('discontinued')}
              >
                Discontinued
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowNotFoundOptions(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* Image Viewer Modal */}
      {showImageViewer && item.reference_image_url && (
        <ImageViewer
          src={item.reference_image_url}
          alt={item.name}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </div>
  );
}
