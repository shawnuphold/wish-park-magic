"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Calendar,
  ExternalLink,
  Download,
  Printer,
  CheckCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Shipment {
  id: string;
  carrier: 'usps' | 'ups' | 'fedex';
  service: string;
  tracking_number: string | null;
  tracking_url: string | null;
  label_url: string | null;
  label_zpl: string | null;
  rate_amount: number | null;
  status: 'pending' | 'label_created' | 'in_transit' | 'delivered' | 'exception';
  shipped_at: string | null;
  delivered_at: string | null;
  created_at: string;
  request: {
    id: string;
    customer: {
      name: string;
      email: string;
      address_line1: string | null;
      address_line2: string | null;
      city: string | null;
      state: string | null;
      postal_code: string | null;
      country: string;
    };
  };
}

export default function ShipmentDetailPage() {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShipment();
  }, [id]);

  const fetchShipment = async () => {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select(`
          *,
          request:requests(
            id,
            customer:customers(name, email, address_line1, address_line2, city, state, postal_code, country)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setShipment({
        ...data,
        carrier: data.carrier as Shipment['carrier'],
        status: data.status as Shipment['status'],
        request: data.request as Shipment['request'],
      });
    } catch (error) {
      console.error('Error fetching shipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async () => {
    if (!shipment) return;

    try {
      const now = new Date().toISOString();

      await supabase
        .from('shipments')
        .update({ status: 'delivered', delivered_at: now })
        .eq('id', shipment.id);

      await supabase
        .from('requests')
        .update({ status: 'delivered' })
        .eq('id', shipment.request.id);

      setShipment((prev) => prev ? { ...prev, status: 'delivered', delivered_at: now } : null);

      toast({
        title: 'Shipment delivered',
        description: 'The shipment has been marked as delivered.',
      });
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipment status',
        variant: 'destructive',
      });
    }
  };

  const printZPL = () => {
    if (!shipment?.label_zpl) return;

    // Create a hidden iframe to print the ZPL
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`<pre>${shipment.label_zpl}</pre>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Shipment not found</p>
        <Link href="/admin/shipments">
          <Button variant="outline" className="mt-4">Back to Shipments</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/shipments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getCarrierColor(
                  shipment.carrier
                )}`}
              >
                <span className="text-xs font-bold uppercase">{shipment.carrier}</span>
              </div>
              <div>
                <h1 className="text-2xl font-heading font-bold text-foreground">
                  {shipment.service}
                </h1>
                <Badge className={getStatusColor(shipment.status)}>
                  {shipment.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {shipment.status !== 'delivered' && (
            <Button variant="outline" onClick={markAsDelivered}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Tracking Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shipment.tracking_number ? (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Tracking Number</p>
                  <p className="font-mono text-lg">{shipment.tracking_number}</p>
                </div>
                {shipment.tracking_url && (
                  <a
                    href={shipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-gold hover:underline"
                  >
                    Track Package
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No tracking information available</p>
            )}

            {shipment.shipped_at && (
              <div>
                <p className="text-sm text-muted-foreground">Shipped At</p>
                <p>{new Date(shipment.shipped_at).toLocaleString()}</p>
              </div>
            )}

            {shipment.delivered_at && (
              <div>
                <p className="text-sm text-muted-foreground">Delivered At</p>
                <p>{new Date(shipment.delivered_at).toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ship To */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Ship To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{shipment.request?.customer?.name}</p>
              <p className="text-sm">{shipment.request?.customer?.address_line1}</p>
              {shipment.request?.customer?.address_line2 && (
                <p className="text-sm">{shipment.request.customer.address_line2}</p>
              )}
              <p className="text-sm">
                {shipment.request?.customer?.city}, {shipment.request?.customer?.state}{' '}
                {shipment.request?.customer?.postal_code}
              </p>
              <p className="text-sm">{shipment.request?.customer?.country}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Label */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Shipping Label
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {shipment.label_url && (
              <a href={shipment.label_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Label
                </Button>
              </a>
            )}

            {shipment.label_zpl && (
              <Button variant="outline" onClick={printZPL}>
                <Printer className="w-4 h-4 mr-2" />
                Print ZPL (Thermal)
              </Button>
            )}
          </div>

          {shipment.rate_amount && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">Shipping Cost</p>
              <p className="text-2xl font-bold">${shipment.rate_amount.toFixed(2)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link href={`/admin/requests/${shipment.request?.id}`}>
          <Button variant="outline">
            View Request
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
