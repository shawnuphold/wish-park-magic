"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils/dates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Filter, Package, Truck, Calendar, ExternalLink } from 'lucide-react';

interface Shipment {
  id: string;
  carrier: 'usps' | 'ups' | 'fedex';
  service: string;
  tracking_number: string | null;
  tracking_url: string | null;
  status: 'pending' | 'label_created' | 'in_transit' | 'delivered' | 'exception';
  rate_amount: number | null;
  created_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  to_name: string | null;
  to_city: string | null;
  to_state: string | null;
  request: {
    id: string;
    customer: { name: string };
  } | null;
  customer: { name: string } | null;
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'label_created', label: 'Label Created' },
  { value: 'in_transit', label: 'In Transit' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'exception', label: 'Exception' },
];

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const { data, error } = await supabase
          .from('shipments')
          .select(`
            *,
            request:requests!shipments_request_id_fkey(
              id,
              customer:customers(name)
            ),
            customer:customers!shipments_customer_id_fkey(name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setShipments(
          data?.map((s) => ({
            ...s,
            carrier: s.carrier as Shipment['carrier'],
            status: s.status as Shipment['status'],
            request: s.request as Shipment['request'],
          })) || []
        );
      } catch (error) {
        console.error('Error fetching shipments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShipments();
  }, []);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      label_created: 'bg-blue-500/10 text-blue-600',
      in_transit: 'bg-purple-500/10 text-purple-600',
      delivered: 'bg-green-500/10 text-green-600',
      exception: 'bg-red-500/10 text-red-600',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600';
  };

  const getCarrierColor = (carrier: string) => {
    const colors: Record<string, string> = {
      usps: 'bg-blue-600',
      ups: 'bg-amber-700',
      fedex: 'bg-purple-600',
    };
    return colors[carrier] || 'bg-gray-600';
  };

  const getShipmentName = (s: Shipment) => {
    return s.request?.customer?.name || s.customer?.name || s.to_name || 'Unknown';
  };

  const filteredShipments = shipments.filter((s) => {
    const name = getShipmentName(s).toLowerCase();
    const matchesSearch =
      name.includes(search.toLowerCase()) ||
      s.tracking_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.to_city?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: shipments.length,
    inTransit: shipments.filter((s) => s.status === 'in_transit').length,
    delivered: shipments.filter((s) => s.status === 'delivered').length,
    pending: shipments.filter((s) => s.status === 'pending' || s.status === 'label_created').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Shipments</h1>
          <p className="text-muted-foreground">Manage shipping labels and tracking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Shipments</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-purple-600">{stats.inTransit}</p>
              </div>
              <Truck className="w-8 h-8 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer or tracking number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No shipments found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create shipments from the Shipping Quote page
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredShipments.map((shipment) => (
                <Link
                  key={shipment.id}
                  href={`/admin/shipments/${shipment.id}`}
                  className="block p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getCarrierColor(
                          shipment.carrier
                        )}`}
                      >
                        <span className="text-xs font-bold uppercase">{shipment.carrier}</span>
                      </div>
                      <div>
                        <p className="font-medium">
                          {getShipmentName(shipment)}
                          {shipment.to_city && shipment.to_state && !shipment.request && (
                            <span className="text-muted-foreground font-normal ml-2">
                              ({shipment.to_city}, {shipment.to_state})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{shipment.service}</span>
                          {shipment.tracking_number && (
                            <span className="flex items-center gap-1 font-mono">
                              {shipment.tracking_number}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(shipment.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {shipment.rate_amount && (
                        <span className="text-sm font-medium">
                          ${shipment.rate_amount.toFixed(2)}
                        </span>
                      )}
                      <Badge className={getStatusColor(shipment.status)}>
                        {shipment.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
