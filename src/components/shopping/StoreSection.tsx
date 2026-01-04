'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, MapPin } from 'lucide-react';
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
    <div className="relative">
      {/* Store Header - Sticky within section */}
      <button
        className="sticky top-[140px] z-[5] w-full px-4 py-3 flex items-center gap-3 text-left bg-background/95 backdrop-blur border-b transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Expand/Collapse Icon */}
        <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600" />
          )}
        </div>

        {/* Store Icon */}
        <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
          <MapPin className="w-4 h-4 text-amber-600" />
        </div>

        {/* Store Name and Land */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">{storeName}</div>
          {landName && (
            <div className="text-sm text-gray-500 truncate">{landName}</div>
          )}
        </div>

        {/* Item Count */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm font-medium text-gray-600">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
          {/* Status indicators */}
          <div className="flex items-center gap-1">
            {pendingCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400" title={`${pendingCount} pending`} />
            )}
            {foundCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-green-500" title={`${foundCount} found`} />
            )}
            {notFoundCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-red-400" title={`${notFoundCount} not found`} />
            )}
          </div>
        </div>
      </button>

      {/* Items */}
      {expanded && (
        <div className="px-4 py-4 space-y-4 bg-gray-50">
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
