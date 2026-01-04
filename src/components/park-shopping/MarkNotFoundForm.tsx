"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NOT_FOUND_REASONS, type NotFoundReason } from '@/lib/park-shopping-config';

interface MarkNotFoundFormProps {
  itemId: string;
  itemName: string;
  onSubmit: (data: {
    reason: NotFoundReason;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function MarkNotFoundForm({
  itemId,
  itemName,
  onSubmit,
  onCancel,
}: MarkNotFoundFormProps) {
  const [reason, setReason] = useState<NotFoundReason | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) return;

    setSubmitting(true);
    try {
      await onSubmit({
        reason,
        notes: notes || undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-red-50 dark:bg-red-950/20 border-t border-red-200 dark:border-red-800">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-red-800 dark:text-red-300">Mark as Not Found</h4>
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
        {/* Reason selection */}
        <div>
          <Label className="text-sm">Reason</Label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {NOT_FOUND_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setReason(r.value)}
                className={cn(
                  "p-3 text-sm font-medium rounded-lg border-2 transition-all text-left",
                  reason === r.value
                    ? "border-red-500 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                    : "border-muted hover:border-red-300 text-muted-foreground"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-sm">Notes (optional)</Label>
          <Textarea
            id="notes"
            placeholder="e.g., Cast member said it was discontinued..."
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
            variant="destructive"
            className="flex-1"
            disabled={submitting || !reason}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Not Found'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
