'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Upload, X, Loader2, CheckCircle, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarkFoundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    estimated_price?: number | null;
    reference_image_url?: string | null;
  } | null;
  tripId: string;
  onConfirm: () => void;
}

export function MarkFoundModal({ open, onOpenChange, item, tripId, onConfirm }: MarkFoundModalProps) {
  const [actualPrice, setActualPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!item) return;

    setSubmitting(true);
    try {
      let found_image_url = null;

      // Upload image if provided
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('folder', 'found-items');

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const { url } = await uploadRes.json();
          found_image_url = url;
        }
      }

      // Mark item as found
      const response = await fetch(`/api/shopping/items/${item.id}/found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actual_price: actualPrice ? parseFloat(actualPrice) : item.estimated_price || 0,
          found_image_url,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark item as found');
      }

      toast({
        title: 'Item marked as found',
        description: item.name,
      });

      // Reset form
      setActualPrice('');
      setNotes('');
      clearImage();
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking item as found:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark item as found',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setActualPrice('');
      setNotes('');
      clearImage();
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Mark as Found
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="flex gap-3 p-3 bg-muted rounded-lg">
            {item.reference_image_url && (
              <div className="relative w-16 h-16 flex-shrink-0 rounded overflow-hidden">
                <Image
                  src={item.reference_image_url}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
            )}
            <div>
              <p className="font-medium text-sm">{item.name}</p>
              {item.estimated_price && (
                <p className="text-sm text-muted-foreground">
                  Est. ${item.estimated_price.toFixed(2)}
                </p>
              )}
            </div>
          </div>

          {/* Actual Price */}
          <div className="space-y-2">
            <Label htmlFor="price">Actual Price</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                placeholder={item.estimated_price?.toFixed(2) || '0.00'}
                value={actualPrice}
                onChange={(e) => setActualPrice(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Photo Capture */}
          <div className="space-y-2">
            <Label>Photo (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />

            {imagePreview ? (
              <div className="relative">
                <div className="relative w-full h-48 rounded-lg overflow-hidden">
                  <Image
                    src={imagePreview}
                    alt="Captured item"
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={clearImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleCameraCapture}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any notes about this item..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Found
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
