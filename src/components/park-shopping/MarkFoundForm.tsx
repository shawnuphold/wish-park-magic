"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, FolderOpen, X, Loader2 } from 'lucide-react';

interface MarkFoundFormProps {
  itemId: string;
  itemName: string;
  maxQuantity: number;
  currentStore?: string | null;
  onSubmit: (data: {
    quantity_found: number;
    actual_price: number;
    store_name?: string;
    found_images?: string[];
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function MarkFoundForm({
  itemId,
  itemName,
  maxQuantity,
  currentStore,
  onSubmit,
  onCancel,
}: MarkFoundFormProps) {
  const [quantity, setQuantity] = useState(maxQuantity);
  const [price, setPrice] = useState('');
  const [store, setStore] = useState(currentStore || '');
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      // For now, create data URLs - in production, upload to S3
      const newImages: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        newImages.push(dataUrl);
      }
      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        quantity_found: quantity,
        actual_price: priceNum,
        store_name: store || undefined,
        found_images: images.length > 0 ? images : undefined,
        notes: notes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-t border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-emerald-800 dark:text-emerald-300">Mark as Found</h4>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="quantity" className="text-sm">Quantity found</Label>
            <Select
              value={quantity.toString()}
              onValueChange={(v) => setQuantity(parseInt(v))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxQuantity }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} of {maxQuantity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="price" className="text-sm">Price each</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>
        </div>

        {/* Photo upload */}
        <div>
          <Label className="text-sm">Take photo of item</Label>
          <div className="flex gap-2 mt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => cameraInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              Gallery
            </Button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          {/* Image previews */}
          {images.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto">
              {images.map((img, idx) => (
                <div key={idx} className="relative flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Found ${idx + 1}`}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Store */}
        <div>
          <Label htmlFor="store" className="text-sm">Store (optional)</Label>
          <Input
            id="store"
            placeholder="e.g., Emporium"
            value={store}
            onChange={(e) => setStore(e.target.value)}
            className="mt-1"
          />
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any additional notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 min-h-[60px]"
          />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={submitting || !price}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Found'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
