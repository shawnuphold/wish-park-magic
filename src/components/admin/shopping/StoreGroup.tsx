'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';
import { TripItemCard } from './TripItemCard';

interface StoreGroupProps {
  storeName: string;
  items: any[];
  defaultExpanded?: boolean;
  onMarkFound: (item: any) => void;
  onMarkNotFound: (item: any) => void;
  disabled?: boolean;
}

export function StoreGroup({
  storeName,
  items,
  defaultExpanded = true,
  onMarkFound,
  onMarkNotFound,
  disabled,
}: StoreGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const foundCount = items.filter(i => i.trip_status === 'found').length;
  const notFoundCount = items.filter(i => ['not_found', 'out_of_stock'].includes(i.trip_status)).length;
  const pendingCount = items.filter(i => ['pending', 'assigned', 'shopping'].includes(i.trip_status || 'pending')).length;

  const allComplete = pendingCount === 0;

  return (
    <Card className={allComplete ? 'opacity-60' : ''}>
      <CardHeader
        className="cursor-pointer py-3 px-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <MapPin className="w-4 h-4 text-gold" />
            <span className="font-medium">{storeName}</span>
          </div>
          <div className="flex items-center gap-2">
            {foundCount > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                {foundCount}
              </Badge>
            )}
            {notFoundCount > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <XCircle className="w-3 h-3 mr-1" />
                {notFoundCount}
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="w-3 h-3 mr-1" />
                {pendingCount}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-4 space-y-3">
          {items.map((item) => (
            <TripItemCard
              key={item.id}
              item={item}
              onMarkFound={onMarkFound}
              onMarkNotFound={onMarkNotFound}
              disabled={disabled}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}
