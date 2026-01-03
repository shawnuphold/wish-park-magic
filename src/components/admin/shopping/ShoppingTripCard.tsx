'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, User, Package, CheckCircle, XCircle, Clock, Play, ChevronRight } from 'lucide-react';
import type { ParkLocation } from '@/lib/database.types';

interface ShoppingTripCardProps {
  trip: {
    id: string;
    name: string | null;
    trip_date: string | null;
    park: string | null;
    status: 'planning' | 'active' | 'completed' | 'cancelled';
    shopper?: { id: string; name: string } | null;
    item_count?: number;
    found_count?: number;
    not_found_count?: number;
    pending_count?: number;
  };
  onStart?: () => void;
}

const PARK_LABELS: Record<string, string> = {
  disney_mk: 'Magic Kingdom',
  disney_epcot: 'EPCOT',
  disney_hs: 'Hollywood Studios',
  disney_ak: 'Animal Kingdom',
  disney_springs: 'Disney Springs',
  universal_usf: 'Universal Studios',
  universal_ioa: 'Islands of Adventure',
  universal_citywalk: 'CityWalk',
  universal_epic: 'Epic Universe',
  seaworld: 'SeaWorld',
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  planning: { bg: 'bg-blue-100', text: 'text-blue-700' },
  active: { bg: 'bg-green-100', text: 'text-green-700' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

export function ShoppingTripCard({ trip, onStart }: ShoppingTripCardProps) {
  const statusStyle = STATUS_STYLES[trip.status] || STATUS_STYLES.planning;
  const parkLabel = trip.park ? PARK_LABELS[trip.park] || trip.park : 'No park set';

  const progressPercent = trip.item_count
    ? Math.round(((trip.found_count || 0) + (trip.not_found_count || 0)) / trip.item_count * 100)
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">
              {trip.name || `Trip - ${trip.trip_date}`}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              {trip.trip_date ? new Date(trip.trip_date).toLocaleDateString() : 'No date'}
            </div>
          </div>
          <Badge className={`${statusStyle.bg} ${statusStyle.text} capitalize`}>
            {trip.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{parkLabel}</span>
          </div>
          {trip.shopper && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{trip.shopper.name}</span>
            </div>
          )}
        </div>

        {/* Item Stats */}
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1">
            <Package className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{trip.item_count || 0} items</span>
          </div>
          {(trip.found_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{trip.found_count}</span>
            </div>
          )}
          {(trip.not_found_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-red-600">
              <XCircle className="w-3.5 h-3.5" />
              <span>{trip.not_found_count}</span>
            </div>
          )}
          {(trip.pending_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              <span>{trip.pending_count}</span>
            </div>
          )}
        </div>

        {/* Progress bar for active/completed trips */}
        {trip.status !== 'planning' && trip.item_count && trip.item_count > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gold transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {trip.status === 'planning' && onStart && (
            <Button size="sm" variant="gold" onClick={onStart} className="flex-1">
              <Play className="w-3.5 h-3.5 mr-1" />
              Start Trip
            </Button>
          )}
          <Link href={`/admin/shopping-trips/${trip.id}`} className="flex-1">
            <Button size="sm" variant={trip.status === 'planning' ? 'outline' : 'gold'} className="w-full">
              {trip.status === 'active' ? 'Continue Shopping' : 'View Details'}
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
