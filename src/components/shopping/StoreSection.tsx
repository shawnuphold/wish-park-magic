'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ShoppingItemCard, type ShoppingItem } from './ShoppingItemCard';

interface StoreSectionProps {
  storeName: string;
  landName?: string | null;
  items: ShoppingItem[];
  onItemUpdate: () => void;
  defaultExpanded?: boolean;
}

export function StoreSection({
  storeName,
  landName,
  items,
  onItemUpdate,
  defaultExpanded = true,
}: StoreSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const pendingCount = items.filter(i => i.status === 'pending').length;
  const foundCount = items.filter(i => i.status === 'found').length;
  const notFoundCount = items.filter(i => i.status === 'not_found').length;

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      {/* Store Header */}
      <button
        className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* Store Icon */}
        <MapPin className="w-4 h-4 text-gold flex-shrink-0" />

        {/* Store Name and Land */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{storeName}</div>
          {landName && (
            <div className="text-xs text-muted-foreground truncate">{landName}</div>
          )}
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {pendingCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {pendingCount}
            </Badge>
          )}
          {foundCount > 0 && (
            <Badge className="bg-green-100 text-green-700 text-xs px-1.5 py-0">
              {foundCount}
            </Badge>
          )}
          {notFoundCount > 0 && (
            <Badge className="bg-red-100 text-red-700 text-xs px-1.5 py-0">
              {notFoundCount}
            </Badge>
          )}
        </div>
      </button>

      {/* Items */}
      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {items.map(item => (
            <ShoppingItemCard
              key={item.id}
              item={item}
              onUpdate={onItemUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
