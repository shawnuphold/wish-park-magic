'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Package, DollarSign, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface TripSummaryProps {
  trip: {
    id: string;
    name: string | null;
    trip_date: string | null;
    items: any[];
  };
  onComplete?: () => void;
}

export function TripSummary({ trip, onComplete }: TripSummaryProps) {
  const items = trip.items || [];

  const foundItems = items.filter(i => i.trip_status === 'found');
  const notFoundItems = items.filter(i => ['not_found', 'out_of_stock'].includes(i.trip_status));
  const pendingItems = items.filter(i => ['pending', 'assigned', 'shopping'].includes(i.trip_status || 'pending'));

  const totalSpent = foundItems.reduce((sum, item) => {
    const price = item.actual_price || item.estimated_price || 0;
    return sum + (price * (item.quantity || 1));
  }, 0);

  // Group by customer
  const byCustomer: Record<string, { found: any[]; notFound: any[] }> = {};
  items.forEach(item => {
    const customerName = item.request?.customer?.name || 'Unknown Customer';
    if (!byCustomer[customerName]) {
      byCustomer[customerName] = { found: [], notFound: [] };
    }
    if (item.trip_status === 'found') {
      byCustomer[customerName].found.push(item);
    } else if (['not_found', 'out_of_stock'].includes(item.trip_status)) {
      byCustomer[customerName].notFound.push(item);
    }
  });

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trip Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Package className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-2xl font-bold">{items.length}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-600" />
              <p className="text-2xl font-bold text-green-700">{foundItems.length}</p>
              <p className="text-xs text-green-600">Found</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <XCircle className="w-6 h-6 mx-auto mb-1 text-red-600" />
              <p className="text-2xl font-bold text-red-700">{notFoundItems.length}</p>
              <p className="text-xs text-red-600">Not Found</p>
            </div>
            <div className="text-center p-3 bg-gold/10 rounded-lg">
              <DollarSign className="w-6 h-6 mx-auto mb-1 text-gold" />
              <p className="text-2xl font-bold text-gold">${totalSpent.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Spent</p>
            </div>
          </div>

          {pendingItems.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>{pendingItems.length} items</strong> still need to be processed
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* By Customer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            By Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(byCustomer).map(([customerName, { found, notFound }]) => (
            <div key={customerName} className="border-b last:border-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{customerName}</span>
                <div className="flex items-center gap-2">
                  {found.length > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      {found.length} found
                    </Badge>
                  )}
                  {notFound.length > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      {notFound.length} not found
                    </Badge>
                  )}
                </div>
              </div>

              {found.length > 0 && (
                <div className="ml-4 space-y-1">
                  {found.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-green-700 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {item.name}
                        {item.quantity > 1 && <span className="text-muted-foreground">x{item.quantity}</span>}
                      </span>
                      {(item.actual_price || item.estimated_price) && (
                        <span className="text-muted-foreground">
                          ${(item.actual_price || item.estimated_price).toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {notFound.length > 0 && (
                <div className="ml-4 space-y-1 mt-1">
                  {notFound.map(item => (
                    <div key={item.id} className="flex items-center gap-1 text-sm text-red-600">
                      <XCircle className="w-3 h-3" />
                      {item.name}
                      {item.trip_status === 'out_of_stock' && (
                        <Badge variant="outline" className="ml-1 text-xs py-0">OOS</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Found Items Detail */}
      {foundItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Found Items ({foundItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {foundItems.map(item => (
                <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.request?.customer?.name}
                      {item.store_name && ` • ${item.store_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${(item.actual_price || item.estimated_price || 0).toFixed(2)}
                    </p>
                    {item.quantity > 1 && (
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-3 border-t font-bold">
                <span>Total</span>
                <span>${totalSpent.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/admin/shopping-trips" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to Trips
          </Button>
        </Link>
        {onComplete && pendingItems.length === 0 && (
          <Button onClick={onComplete} variant="gold" className="flex-1">
            Complete Trip
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
}
