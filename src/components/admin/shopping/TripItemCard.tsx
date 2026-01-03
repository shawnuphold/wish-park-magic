'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Image as ImageIcon, ChevronDown, ChevronUp, User, DollarSign } from 'lucide-react';
import type { ItemCategory } from '@/lib/database.types';

interface TripItemCardProps {
  item: {
    id: string;
    name: string;
    description?: string | null;
    category: ItemCategory;
    reference_image_url?: string | null;
    found_image_url?: string | null;
    estimated_price?: number | null;
    actual_price?: number | null;
    quantity: number;
    trip_status?: string | null;
    trip_notes?: string | null;
    priority?: number;
    store_name?: string | null;
    request?: {
      id: string;
      customer?: { id: string; name: string } | null;
    } | null;
  };
  onMarkFound: (item: any) => void;
  onMarkNotFound: (item: any) => void;
  disabled?: boolean;
}

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  loungefly: 'bg-pink-100 text-pink-700',
  ears: 'bg-purple-100 text-purple-700',
  spirit_jersey: 'bg-blue-100 text-blue-700',
  popcorn_bucket: 'bg-yellow-100 text-yellow-700',
  pins: 'bg-red-100 text-red-700',
  plush: 'bg-orange-100 text-orange-700',
  apparel: 'bg-indigo-100 text-indigo-700',
  drinkware: 'bg-cyan-100 text-cyan-700',
  collectible: 'bg-amber-100 text-amber-700',
  home_decor: 'bg-emerald-100 text-emerald-700',
  toys: 'bg-lime-100 text-lime-700',
  jewelry: 'bg-rose-100 text-rose-700',
  other: 'bg-gray-100 text-gray-700',
};

const STATUS_BADGES: Record<string, { bg: string; text: string; icon: any }> = {
  found: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
  not_found: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  out_of_stock: { bg: 'bg-orange-100', text: 'text-orange-700', icon: XCircle },
};

export function TripItemCard({ item, onMarkFound, onMarkNotFound, disabled }: TripItemCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isProcessed = ['found', 'not_found', 'out_of_stock'].includes(item.trip_status || '');
  const statusInfo = item.trip_status ? STATUS_BADGES[item.trip_status] : null;
  const categoryColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other;
  const imageUrl = item.found_image_url || item.reference_image_url;

  const priorityLabel = (item.priority || 5) <= 3 ? 'High' : (item.priority || 5) <= 6 ? 'Normal' : 'Low';
  const priorityColor = (item.priority || 5) <= 3 ? 'text-red-600' : (item.priority || 5) <= 6 ? 'text-gray-600' : 'text-gray-400';

  return (
    <Card className={`transition-all ${isProcessed ? 'opacity-60' : ''}`}>
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Image */}
          <div className="relative w-20 h-20 flex-shrink-0 bg-muted rounded-lg overflow-hidden">
            {imageUrl ? (
              <Image
                src={imageUrl}
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
            {item.quantity > 1 && (
              <Badge className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5">
                x{item.quantity}
              </Badge>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className={`text-xs py-0 ${categoryColor}`}>
                    {item.category.replace('_', ' ')}
                  </Badge>
                  <span className={`text-xs ${priorityColor}`}>{priorityLabel}</span>
                </div>
              </div>
              {statusInfo && (
                <Badge className={`${statusInfo.bg} ${statusInfo.text} flex items-center gap-1`}>
                  <statusInfo.icon className="w-3 h-3" />
                  {item.trip_status?.replace('_', ' ')}
                </Badge>
              )}
            </div>

            {/* Customer & Price */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {item.request?.customer && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span className="truncate">{item.request.customer.name}</span>
                </div>
              )}
              {(item.estimated_price || item.actual_price) && (
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>${(item.actual_price || item.estimated_price)?.toFixed(2)}</span>
                  {item.actual_price && item.estimated_price && item.actual_price !== item.estimated_price && (
                    <span className="line-through text-muted-foreground/50">${item.estimated_price.toFixed(2)}</span>
                  )}
                </div>
              )}
            </div>

            {/* Expand button for description/notes */}
            {(item.description || item.trip_notes) && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-muted-foreground mt-1 hover:text-foreground"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {expanded ? 'Less' : 'More details'}
              </button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-3 pt-3 border-t text-sm space-y-2">
            {item.description && (
              <p className="text-muted-foreground">{item.description}</p>
            )}
            {item.trip_notes && (
              <p className="text-amber-600 italic">Note: {item.trip_notes}</p>
            )}
          </div>
        )}

        {/* Action buttons - only show if not processed */}
        {!isProcessed && (
          <div className="flex gap-2 mt-3">
            <Button
              size="lg"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white h-12 text-base"
              onClick={() => onMarkFound(item)}
              disabled={disabled}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Found
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50 h-12 text-base"
              onClick={() => onMarkNotFound(item)}
              disabled={disabled}
            >
              <XCircle className="w-5 h-5 mr-2" />
              Not Found
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
