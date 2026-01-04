"use client";

import { useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RequestCard, type RequestItemData } from './RequestCard';
import type { NotFoundReason } from '@/lib/park-shopping-config';

interface StoreSectionProps {
  storeName: string;
  landName?: string | null;
  items: RequestItemData[];
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
  onDelete: (itemId: string) => Promise<void>;
}

export function StoreSection({
  storeName,
  landName,
  items,
  onMarkFound,
  onMarkNotFound,
  onReset,
  onDelete,
}: StoreSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const foundCount = items.filter(i => i.status === 'found').length;
  const notFoundCount = items.filter(i => i.status === 'not_found').length;

  return (
    <div className="space-y-3">
      {/* Store header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-gold" />
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{storeName}</h3>
            {landName && (
              <p className="text-xs text-muted-foreground">{landName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status counts */}
          <div className="flex items-center gap-2 text-xs">
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600">
                {pendingCount} pending
              </span>
            )}
            {foundCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                {foundCount} found
              </span>
            )}
            {notFoundCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                {notFoundCount} not found
              </span>
            )}
          </div>

          <span className="text-sm text-muted-foreground">
            ({items.length})
          </span>

          <ChevronDown
            className={cn(
              "w-5 h-5 text-muted-foreground transition-transform",
              isExpanded && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Items */}
      {isExpanded && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <RequestCard
              key={item.id}
              item={item}
              onMarkFound={onMarkFound}
              onMarkNotFound={onMarkNotFound}
              onReset={onReset}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
