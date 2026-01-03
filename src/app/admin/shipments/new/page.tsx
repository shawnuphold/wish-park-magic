"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Package, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PARCEL_PRESETS } from '@/lib/shippo';

interface Request {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string;
  };
}

interface Rate {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  estimated_days: number;
}

const carriers = [
  { value: 'usps', label: 'USPS' },
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
];

function NewShipmentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get('request');
  const { toast } = useToast();

  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [selectedRate, setSelectedRate] = useState<string>('');
  const [labelFormat, setLabelFormat] = useState<'PDF' | 'PNG' | 'ZPL'>('PDF');

  const [parcelType, setParcelType] = useState('small');
  const [customParcel, setCustomParcel] = useState({
    length: '',
    width: '',
    height: '',
    weight: '',
  });

  useEffect(() => {
    const fetchRequest = async () => {
      if (!requestId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('requests')
          .select(`
            id,
            customer:customers(*)
          `)
          .eq('id', requestId)
          .single();

        if (error) throw error;

        setRequest({
          id: data.id,
          customer: data.customer as Request['customer'],
        });
      } catch (error) {
        console.error('Error fetching request:', error);
        toast({
          title: 'Error',
          description: 'Failed to load request',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [requestId, toast]);

  const fetchRates = async () => {
    if (!request?.customer.address_line1) {
      toast({
        title: 'Error',
        description: 'Customer address is incomplete',
        variant: 'destructive',
      });
      return;
    }

    setFetchingRates(true);

    try {
      const parcel = parcelType === 'custom'
        ? customParcel
        : PARCEL_PRESETS[parcelType as keyof typeof PARCEL_PRESETS];

      const response = await fetch('/api/shippo/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressTo: {
            name: request.customer.name,
            street1: request.customer.address_line1,
            street2: request.customer.address_line2,
            city: request.customer.city,
            state: request.customer.state,
            zip: request.customer.postal_code,
            country: request.customer.country,
            email: request.customer.email,
            phone: request.customer.phone,
          },
          parcel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get rates');
      }

      const data = await response.json();
      setRates(data.rates || []);

      if (data.rates?.length > 0) {
        setSelectedRate(data.rates[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching rates:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get shipping rates',
        variant: 'destructive',
      });
    } finally {
      setFetchingRates(false);
    }
  };

  const purchaseLabel = async () => {
    if (!selectedRate || !request) return;

    setPurchasing(true);

    try {
      const selectedRateData = rates.find((r) => r.id === selectedRate);
      if (!selectedRateData) throw new Error('Rate not found');

      const response = await fetch('/api/shippo/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateId: selectedRate,
          labelFormat,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to purchase label');
      }

      const data = await response.json();

      // Create shipment record
      const { data: shipment, error: dbError } = await supabase
        .from('shipments')
        .insert({
          request_id: request.id,
          carrier: selectedRateData.carrier.toLowerCase() as 'usps' | 'ups' | 'fedex',
          service: selectedRateData.service,
          shippo_shipment_id: data.shipmentId,
          shippo_transaction_id: data.transactionId,
          tracking_number: data.trackingNumber,
          tracking_url: data.trackingUrl,
          label_url: data.labelUrl,
          label_zpl: labelFormat === 'ZPL' ? data.labelZpl : null,
          rate_amount: selectedRateData.amount,
          status: 'label_created',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update request status
      await supabase
        .from('requests')
        .update({ status: 'shipped', shipment_id: shipment.id })
        .eq('id', request.id);

      toast({
        title: 'Label purchased',
        description: 'Shipping label has been created successfully.',
      });

      router.push(`/admin/shipments/${shipment.id}`);
    } catch (error: any) {
      console.error('Error purchasing label:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase label',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No request specified</p>
        <Link href="/admin/requests">
          <Button variant="outline" className="mt-4">Go to Requests</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/shipments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Create Shipment</h1>
          <p className="text-muted-foreground">Generate a shipping label for {request.customer.name}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Shipping To */}
        <Card>
          <CardHeader>
            <CardTitle>Ship To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="font-medium">{request.customer.name}</p>
              {request.customer.address_line1 && (
                <>
                  <p className="text-sm">{request.customer.address_line1}</p>
                  {request.customer.address_line2 && (
                    <p className="text-sm">{request.customer.address_line2}</p>
                  )}
                  <p className="text-sm">
                    {request.customer.city}, {request.customer.state} {request.customer.postal_code}
                  </p>
                  <p className="text-sm">{request.customer.country}</p>
                </>
              )}
              {!request.customer.address_line1 && (
                <p className="text-sm text-destructive">Address not on file</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Package Size */}
        <Card>
          <CardHeader>
            <CardTitle>Package Size</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={parcelType} onValueChange={setParcelType} className="space-y-3">
              {Object.entries(PARCEL_PRESETS).map(([key, preset]) => (
                <div key={key} className="flex items-center space-x-3">
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="flex-1 cursor-pointer">
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({preset.length}" × {preset.width}" × {preset.height}", ~{preset.weight}lb)
                    </span>
                  </Label>
                </div>
              ))}
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer">Custom Size</Label>
              </div>
            </RadioGroup>

            {parcelType === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Length (in)</Label>
                  <Input
                    type="number"
                    value={customParcel.length}
                    onChange={(e) => setCustomParcel((p) => ({ ...p, length: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Width (in)</Label>
                  <Input
                    type="number"
                    value={customParcel.width}
                    onChange={(e) => setCustomParcel((p) => ({ ...p, width: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (in)</Label>
                  <Input
                    type="number"
                    value={customParcel.height}
                    onChange={(e) => setCustomParcel((p) => ({ ...p, height: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (lb)</Label>
                  <Input
                    type="number"
                    value={customParcel.weight}
                    onChange={(e) => setCustomParcel((p) => ({ ...p, weight: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Get Rates Button */}
      {rates.length === 0 && (
        <div className="flex justify-center">
          <Button
            variant="gold"
            size="lg"
            onClick={fetchRates}
            disabled={fetchingRates || !request.customer.address_line1}
          >
            {fetchingRates ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting Rates...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 mr-2" />
                Get Shipping Rates
              </>
            )}
          </Button>
        </div>
      )}

      {/* Rates Selection */}
      {rates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Shipping Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={selectedRate} onValueChange={setSelectedRate} className="space-y-3">
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedRate === rate.id ? 'border-gold bg-gold/10' : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedRate(rate.id)}
                >
                  <div className="flex items-center gap-4">
                    <RadioGroupItem value={rate.id} id={rate.id} />
                    <div>
                      <p className="font-medium">{rate.carrier} - {rate.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {rate.estimated_days} business day{rate.estimated_days !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold">${rate.amount.toFixed(2)}</p>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label>Label Format</Label>
                <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as typeof labelFormat)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="PNG">PNG (Image)</SelectItem>
                    <SelectItem value="ZPL">ZPL (Thermal Printer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="gold"
                size="lg"
                onClick={purchaseLabel}
                disabled={purchasing || !selectedRate}
                className="w-full"
              >
                {purchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Purchasing Label...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4 mr-2" />
                    Purchase Label (${rates.find((r) => r.id === selectedRate)?.amount.toFixed(2) || '0.00'})
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function NewShipmentPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    }>
      <NewShipmentForm />
    </Suspense>
  );
}
