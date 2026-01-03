'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { XCircle, Loader2, PackageX, AlertTriangle, HelpCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MarkNotFoundModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    reference_image_url?: string | null;
    store_name?: string | null;
  } | null;
  tripId: string;
  onConfirm: () => void;
}

const REASONS = [
  { value: 'not_found', label: 'Not Found', description: 'Item not found in store', icon: HelpCircle },
  { value: 'out_of_stock', label: 'Out of Stock', description: 'Item exists but sold out', icon: PackageX },
  { value: 'discontinued', label: 'Discontinued', description: 'Item no longer sold', icon: AlertTriangle },
];

export function MarkNotFoundModal({ open, onOpenChange, item, tripId, onConfirm }: MarkNotFoundModalProps) {
  const [reason, setReason] = useState<string>('not_found');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!item) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/shopping-trips/${tripId}/items/${item.id}/not-found`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          trip_notes: notes || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark item as not found');
      }

      const reasonLabel = REASONS.find(r => r.value === reason)?.label || reason;

      toast({
        title: `Item marked as ${reasonLabel}`,
        description: item.name,
      });

      // Reset form
      setReason('not_found');
      setNotes('');
      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking item as not found:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark item as not found',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason('not_found');
      setNotes('');
      onOpenChange(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Mark as Not Found
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
              {item.store_name && (
                <p className="text-sm text-muted-foreground">
                  {item.store_name}
                </p>
              )}
            </div>
          </div>

          {/* Reason Selection */}
          <div className="space-y-3">
            <Label>Reason</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === r.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <RadioGroupItem value={r.value} />
                  <r.icon className={`w-5 h-5 ${
                    reason === r.value ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details..."
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
            variant="destructive"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirm Not Found
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
