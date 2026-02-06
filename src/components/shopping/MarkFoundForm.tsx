'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { ShoppingItem } from './ShoppingItemCard';

interface MarkFoundFormProps {
  item: ShoppingItem;
  onSave: () => void;
  onCancel: () => void;
}

export function MarkFoundForm({ item, onSave, onCancel }: MarkFoundFormProps) {
  const [price, setPrice] = useState(item.estimated_price?.toString() || '');
  const [quantityFound, setQuantityFound] = useState((item.quantity || 1).toString());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasMultiple = (item.quantity || 1) > 1;

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPhotoUrl(data.url);
      } else {
        toast.error('Failed to upload photo');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!price) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/shopping/items/${item.id}/found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_price: parseFloat(price),
          quantity_found: parseInt(quantityFound) || 1,
          found_image_url: photoUrl,
        }),
      });

      if (response.ok) {
        onSave();
      } else {
        toast.error('Failed to save item');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg space-y-3">
      {/* Quantity selector (only if multiple) */}
      {hasMultiple && (
        <div>
          <Label className="text-sm">Found how many?</Label>
          <div className="flex items-center gap-2 mt-1">
            <select
              value={quantityFound}
              onChange={(e) => setQuantityFound(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {Array.from({ length: item.quantity || 1 }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>{n} of {item.quantity}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Price input */}
      <div>
        <Label className="text-sm">
          Price {hasMultiple && parseInt(quantityFound) > 1 ? 'each' : ''}
        </Label>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg">$</span>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
            className="h-12 text-lg font-medium"
            inputMode="decimal"
          />
        </div>
        {item.estimated_price && (
          <p className="text-xs text-muted-foreground mt-1">
            Est: ${item.estimated_price.toFixed(2)}
          </p>
        )}
      </div>

      {/* Photo capture */}
      <div>
        <Label className="text-sm">Photo (optional)</Label>
        <div className="mt-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoCapture}
            className="hidden"
          />
          {photoUrl ? (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted">
              <img src={photoUrl} alt="Captured" className="w-full h-full object-cover" />
              <button
                onClick={() => setPhotoUrl(null)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-10"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              Take Photo
            </Button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="ghost"
          className="flex-1 h-10"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 h-10 bg-green-600 hover:bg-green-700"
          onClick={handleSave}
          disabled={!price || saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
