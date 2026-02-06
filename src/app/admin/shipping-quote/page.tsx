"use client";

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calculator, Loader2, Package, Truck, Copy, Check, ShoppingCart, ExternalLink, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PARCEL_PRESETS } from '@/lib/shippo';
import { supabase } from '@/integrations/supabase/client';

interface Rate {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  estimated_days: number;
  duration_terms?: string;
}

interface Customer {
  id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

interface PurchaseResult {
  transactionId: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
}

export default function ShippingQuotePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Rate[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [shippoShipmentId, setShippoShipmentId] = useState<string | null>(null);

  // Label purchase
  const [selectedRate, setSelectedRate] = useState<Rate | null>(null);
  const [buyingLabel, setBuyingLabel] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<PurchaseResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Customer search
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  // Address form
  const [address, setAddress] = useState({
    name: '',
    street1: '',
    street2: '',
    city: '',
    state: '',
    zip: '',
    country: 'US',
  });

  // Parcel
  const [parcelType, setParcelType] = useState('small');
  const [customParcel, setCustomParcel] = useState({
    length: '',
    width: '',
    height: '',
    weight: '',
  });

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedSearchCustomers = useCallback((query: string) => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => searchCustomers(query), 300);
  }, []);

  const searchCustomers = async (query: string) => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }

    setSearchingCustomers(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, address_line1, city, state, postal_code, country')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setAddress({
      name: customer.name,
      street1: customer.address_line1 || '',
      street2: '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.postal_code || '',
      country: customer.country || 'US',
    });
    setCustomers([]);
    setCustomerSearch('');
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
    setAddress({
      name: '',
      street1: '',
      street2: '',
      city: '',
      state: '',
      zip: '',
      country: 'US',
    });
  };

  const fetchRates = async () => {
    if (!address.street1 || !address.city || !address.state || !address.zip) {
      toast({
        title: 'Error',
        description: 'Please complete the destination address',
        variant: 'destructive',
      });
      return;
    }

    // Validate custom parcel dimensions
    if (parcelType === 'custom') {
      if (!customParcel.length || !customParcel.width || !customParcel.height || !customParcel.weight) {
        toast({
          title: 'Error',
          description: 'Please enter all custom package dimensions',
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    setRates([]);

    try {
      const parcel = parcelType === 'custom'
        ? {
            length: customParcel.length,
            width: customParcel.width,
            height: customParcel.height,
            weight: customParcel.weight,
          }
        : PARCEL_PRESETS[parcelType as keyof typeof PARCEL_PRESETS];

      const response = await fetch('/api/shippo/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addressTo: address,
          parcel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get rates');
      }

      const data = await response.json();
      setRates(data.rates || []);
      setShippoShipmentId(data.shipmentId || null);

      if (data.rates?.length === 0) {
        toast({
          title: 'No rates found',
          description: 'No shipping rates available for this destination.',
        });
      }
    } catch (error: any) {
      console.error('Error fetching rates:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get shipping rates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyQuote = (rate: Rate) => {
    const quote = `${rate.carrier} ${rate.service}: $${rate.amount.toFixed(2)} (${rate.estimated_days} days)`;
    navigator.clipboard.writeText(quote);
    setCopied(rate.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getCarrierColor = (carrier: string) => {
    const colors: Record<string, string> = {
      USPS: 'bg-blue-600',
      UPS: 'bg-amber-700',
      FedEx: 'bg-purple-600',
    };
    return colors[carrier] || 'bg-gray-600';
  };

  const handleBuyLabel = (rate: Rate) => {
    setSelectedRate(rate);
    setShowConfirmDialog(true);
  };

  const purchaseLabel = async () => {
    if (!selectedRate) return;

    setBuyingLabel(true);
    try {
      const response = await fetch('/api/shippo/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateId: selectedRate.id,
          labelFormat: 'PDF',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to purchase label');
      }

      const data = await response.json();

      // Store shipment in database if customer is selected
      if (selectedCustomer) {
        const carrierMap: Record<string, 'usps' | 'ups' | 'fedex'> = {
          'USPS': 'usps',
          'UPS': 'ups',
          'FedEx': 'fedex',
        };

        await supabase.from('shipments').insert({
          customer_id: selectedCustomer.id,
          carrier: carrierMap[selectedRate.carrier] || 'usps',
          service: selectedRate.service,
          shippo_shipment_id: shippoShipmentId,
          shippo_transaction_id: data.transactionId,
          tracking_number: data.trackingNumber,
          tracking_url: data.trackingUrl,
          label_url: data.labelUrl,
          rate_amount: selectedRate.amount,
          status: 'label_created',
          to_name: address.name,
          to_street1: address.street1,
          to_city: address.city,
          to_state: address.state,
          to_zip: address.zip,
        });
      }

      setPurchaseResult(data);
      setShowConfirmDialog(false);
      setShowSuccessDialog(true);

      toast({
        title: 'Label purchased!',
        description: `Tracking: ${data.trackingNumber}`,
      });
    } catch (error: any) {
      console.error('Error purchasing label:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to purchase label',
        variant: 'destructive',
      });
    } finally {
      setBuyingLabel(false);
    }
  };

  const resetForm = () => {
    setRates([]);
    setSelectedRate(null);
    setPurchaseResult(null);
    setShowSuccessDialog(false);
    setShippoShipmentId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Shipping Quote</h1>
        <p className="text-muted-foreground">Get shipping rates for any destination</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Destination Address */}
        <Card>
          <CardHeader>
            <CardTitle>Destination Address</CardTitle>
            <CardDescription>Search for a customer or enter address manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Search */}
            <div className="space-y-2">
              <Label>Quick Fill from Customer</Label>
              <div className="relative">
                <Input
                  placeholder="Search customers..."
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    debouncedSearchCustomers(e.target.value);
                  }}
                />
                {customers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {customers.map((customer) => (
                      <button
                        key={customer.id}
                        className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                        onClick={() => selectCustomer(customer)}
                      >
                        <p className="font-medium">{customer.name}</p>
                        {customer.address_line1 && (
                          <p className="text-xs text-muted-foreground">
                            {customer.city}, {customer.state} {customer.postal_code}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedCustomer && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Using address for:</span>
                  <span className="font-medium">{selectedCustomer.name}</span>
                  <Button variant="ghost" size="sm" onClick={clearCustomer}>Clear</Button>
                </div>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={address.name}
                    onChange={(e) => setAddress({ ...address, name: e.target.value })}
                    placeholder="Recipient name"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Street Address *</Label>
                  <Input
                    value={address.street1}
                    onChange={(e) => setAddress({ ...address, street1: e.target.value })}
                    placeholder="123 Main St"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Apt/Suite</Label>
                  <Input
                    value={address.street2}
                    onChange={(e) => setAddress({ ...address, street2: e.target.value })}
                    placeholder="Apt 4B"
                  />
                </div>
                <div className="space-y-2">
                  <Label>City *</Label>
                  <Input
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    placeholder="Orlando"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State *</Label>
                  <Select value={address.state} onValueChange={(v) => setAddress({ ...address, state: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code *</Label>
                  <Input
                    value={address.zip}
                    onChange={(e) => setAddress({ ...address, zip: e.target.value })}
                    placeholder="32801"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={address.country} onValueChange={(v) => setAddress({ ...address, country: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US">United States</SelectItem>
                      <SelectItem value="CA">Canada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Package Size */}
        <Card>
          <CardHeader>
            <CardTitle>Package Size</CardTitle>
            <CardDescription>Select a preset or enter custom dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={parcelType} onValueChange={setParcelType} className="space-y-3">
              {Object.entries(PARCEL_PRESETS).map(([key, preset]) => (
                <div key={key} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                  onClick={() => setParcelType(key)}>
                  <RadioGroupItem value={key} id={key} />
                  <Label htmlFor={key} className="flex-1 cursor-pointer">
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-sm text-muted-foreground block">
                      {preset.length}" × {preset.width}" × {preset.height}" • ~{preset.weight} lb
                    </span>
                  </Label>
                </div>
              ))}
              <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => setParcelType('custom')}>
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="cursor-pointer font-medium">Custom Size</Label>
              </div>
            </RadioGroup>

            {parcelType === 'custom' && (
              <div className="grid grid-cols-2 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label>Length (in)</Label>
                  <Input
                    type="number"
                    value={customParcel.length}
                    onChange={(e) => setCustomParcel({ ...customParcel, length: e.target.value })}
                    placeholder="12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Width (in)</Label>
                  <Input
                    type="number"
                    value={customParcel.width}
                    onChange={(e) => setCustomParcel({ ...customParcel, width: e.target.value })}
                    placeholder="8"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height (in)</Label>
                  <Input
                    type="number"
                    value={customParcel.height}
                    onChange={(e) => setCustomParcel({ ...customParcel, height: e.target.value })}
                    placeholder="6"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (lb)</Label>
                  <Input
                    type="number"
                    value={customParcel.weight}
                    onChange={(e) => setCustomParcel({ ...customParcel, weight: e.target.value })}
                    placeholder="2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Get Rates Button */}
      <div className="flex justify-center">
        <Button
          variant="gold"
          size="lg"
          onClick={fetchRates}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Rates...
            </>
          ) : (
            <>
              <Calculator className="w-4 h-4 mr-2" />
              Get Shipping Rates
            </>
          )}
        </Button>
      </div>

      {/* Rates Results */}
      {rates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Available Shipping Options ({rates.length})
            </CardTitle>
            <CardDescription>Click any rate to copy the quote</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rates.map((rate) => (
                <div
                  key={rate.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${getCarrierColor(rate.carrier)}`}>
                      <span className="text-xs font-bold">{rate.carrier}</span>
                    </div>
                    <div>
                      <p className="font-medium">{rate.service}</p>
                      <p className="text-sm text-muted-foreground">
                        {rate.estimated_days === 1 ? '1 business day' : `${rate.estimated_days} business days`}
                        {rate.duration_terms && ` • ${rate.duration_terms}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">${rate.amount.toFixed(2)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyQuote(rate)}
                      title="Copy quote"
                    >
                      {copied === rate.id ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </Button>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleBuyLabel(rate)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
                      Buy
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Box */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Rate Summary</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Cheapest:</span> {rates[0]?.carrier} {rates[0]?.service} - ${rates[0]?.amount.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Fastest:</span> {
                  rates.reduce((prev, curr) => prev.estimated_days < curr.estimated_days ? prev : curr).carrier
                } {
                  rates.reduce((prev, curr) => prev.estimated_days < curr.estimated_days ? prev : curr).service
                } - {
                  rates.reduce((prev, curr) => prev.estimated_days < curr.estimated_days ? prev : curr).estimated_days
                } day(s)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Label Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase a shipping label. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedRate && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carrier</span>
                  <span className="font-medium">{selectedRate.carrier}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium">{selectedRate.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery</span>
                  <span className="font-medium">
                    {selectedRate.estimated_days} business day{selectedRate.estimated_days !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-medium">Total</span>
                  <span className="text-lg font-bold">${selectedRate.amount.toFixed(2)}</span>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-1">Ship To</p>
                <p className="text-sm text-muted-foreground">
                  {address.name}<br />
                  {address.street1}{address.street2 && `, ${address.street2}`}<br />
                  {address.city}, {address.state} {address.zip}
                </p>
              </div>
              {!selectedCustomer && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  No customer selected. The shipment won't be saved to the database.
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={buyingLabel}>
              Cancel
            </Button>
            <Button variant="gold" onClick={purchaseLabel} disabled={buyingLabel}>
              {buyingLabel ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Purchasing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Purchase Label
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <Check className="w-5 h-5" />
              Label Purchased Successfully!
            </DialogTitle>
          </DialogHeader>
          {purchaseResult && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tracking Number</span>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                      {purchaseResult.trackingNumber}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(purchaseResult.trackingNumber);
                        toast({ title: 'Copied!' });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {purchaseResult.trackingUrl && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Track Package</span>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => window.open(purchaseResult.trackingUrl, '_blank')}
                    >
                      Open Tracking <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="gold"
                  className="flex-1"
                  onClick={() => window.open(purchaseResult.labelUrl, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Label (PDF)
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `Tracking: ${purchaseResult.trackingNumber}\n${purchaseResult.trackingUrl || ''}`
                  );
                  toast({ title: 'Tracking info copied!' });
                }}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Tracking Info
              </Button>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>
              New Quote
            </Button>
            <Button onClick={() => router.push('/admin/shipments')}>
              View All Shipments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
