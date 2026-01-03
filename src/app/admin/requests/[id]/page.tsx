// @ts-nocheck
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  User,
  Calendar,
  Package,
  DollarSign,
  Truck,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  ImageIcon,
  Camera,
  MapPin,
} from 'lucide-react';
import { ImageGallery } from '@/components/ImageGallery';
import { ImageUploader } from '@/components/ImageUploader';
import { useToast } from '@/hooks/use-toast';
import {
  type RequestStatus,
  type ItemCategory,
  type Park,
  calculatePickupFee,
  calculateTax,
  FLORIDA_TAX_RATE,
} from '@/lib/database.types';
import { LocationPicker } from '@/components/LocationPicker';

interface RequestItem {
  id: string;
  name: string;
  description: string | null;
  category: ItemCategory;
  park: Park;
  reference_url: string | null;
  reference_images: string[];
  quantity: number;
  estimated_price: number | null;
  actual_price: number | null;
  pickup_fee: number | null;
  is_specialty: boolean;
  status: 'pending' | 'found' | 'not_found' | 'substituted';
  found_image_url: string | null;
  found_images: string[];
  receipt_image: string | null;
  found_location_id: string | null;
  found_at: string | null;
  notes: string | null;
}

interface StoreLocation {
  id: string;
  name: string;
  park: Park;
}

interface Request {
  id: string;
  status: RequestStatus;
  notes: string | null;
  quoted_total: number | null;
  approved_at: string | null;
  shopping_trip_id: string | null;
  invoice_id: string | null;
  shipment_id: string | null;
  created_at: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  items: RequestItem[];
}

const statusFlow: RequestStatus[] = [
  'pending',
  'quoted',
  'approved',
  'scheduled',
  'shopping',
  'found',
  'invoiced',
  'paid',
  'shipped',
  'delivered',
];

const itemStatusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'found', label: 'Found' },
  { value: 'not_found', label: 'Not Found' },
  { value: 'substituted', label: 'Substituted' },
];

export default function RequestDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [request, setRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, { actual: string; pickup: string }>>({});

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          customer:customers(*),
          items:request_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      setRequest({
        ...data,
        customer: data.customer as Request['customer'],
        items: (data.items as RequestItem[]) || [],
      });

      // Initialize editing prices
      const prices: Record<string, { actual: string; pickup: string }> = {};
      (data.items as RequestItem[])?.forEach((item) => {
        prices[item.id] = {
          actual: item.actual_price?.toString() || item.estimated_price?.toString() || '',
          pickup: item.pickup_fee?.toString() || calculatePickupFee(item.category, item.actual_price || item.estimated_price || 0).toString(),
        };
      });
      setEditingPrices(prices);
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

  const updateStatus = async (newStatus: RequestStatus) => {
    if (!request) return;
    setUpdating(true);

    try {
      const updates: Partial<Request> = { status: newStatus };

      if (newStatus === 'approved') {
        updates.approved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('requests')
        .update(updates)
        .eq('id', request.id);

      if (error) throw error;

      setRequest((prev) => prev ? { ...prev, ...updates } : null);
      toast({
        title: 'Status updated',
        description: `Request status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('request_items')
        .update({ status: newStatus as 'pending' | 'found' | 'not_found' | 'substituted' })
        .eq('id', itemId);

      if (error) throw error;

      setRequest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, status: newStatus as RequestItem['status'] } : item
          ),
        };
      });
    } catch (error) {
      console.error('Error updating item status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item status',
        variant: 'destructive',
      });
    }
  };

  const saveItemPrices = async (itemId: string) => {
    const prices = editingPrices[itemId];
    if (!prices) return;

    try {
      const { error } = await supabase
        .from('request_items')
        .update({
          actual_price: prices.actual ? parseFloat(prices.actual) : null,
          pickup_fee: prices.pickup ? parseFloat(prices.pickup) : null,
        })
        .eq('id', itemId);

      if (error) throw error;

      setRequest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  actual_price: prices.actual ? parseFloat(prices.actual) : null,
                  pickup_fee: prices.pickup ? parseFloat(prices.pickup) : null,
                }
              : item
          ),
        };
      });

      toast({ title: 'Prices saved' });
    } catch (error) {
      console.error('Error saving prices:', error);
      toast({
        title: 'Error',
        description: 'Failed to save prices',
        variant: 'destructive',
      });
    }
  };

  const updateItemImages = async (itemId: string, field: 'reference_images' | 'found_images', images: string[]) => {
    try {
      const updates: Record<string, any> = { [field]: images };

      // If adding found images, also update found_at timestamp
      if (field === 'found_images' && images.length > 0) {
        const item = request?.items.find(i => i.id === itemId);
        if (item && !item.found_at) {
          updates.found_at = new Date().toISOString();
        }
      }

      const { error } = await supabase
        .from('request_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setRequest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId
              ? { ...item, ...updates }
              : item
          ),
        };
      });
    } catch (error) {
      console.error('Error updating images:', error);
      toast({
        title: 'Error',
        description: 'Failed to update images',
        variant: 'destructive',
      });
    }
  };

  const generateQuote = async () => {
    if (!request) return;

    // Calculate totals
    let subtotal = 0;
    request.items.forEach((item) => {
      const price = parseFloat(editingPrices[item.id]?.actual || '0') || item.actual_price || item.estimated_price || 0;
      const pickup = parseFloat(editingPrices[item.id]?.pickup || '0') || item.pickup_fee || 0;
      subtotal += (price + pickup) * item.quantity;
    });

    const tax = calculateTax(subtotal);
    const total = subtotal + tax;

    try {
      const { error } = await supabase
        .from('requests')
        .update({
          quoted_total: total,
          status: 'quoted',
        })
        .eq('id', request.id);

      if (error) throw error;

      setRequest((prev) => prev ? { ...prev, quoted_total: total, status: 'quoted' } : null);
      setShowQuoteDialog(false);
      toast({
        title: 'Quote generated',
        description: `Total: $${total.toFixed(2)} (includes $${tax.toFixed(2)} tax)`,
      });
    } catch (error) {
      console.error('Error generating quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate quote',
        variant: 'destructive',
      });
    }
  };

  const createInvoice = async () => {
    if (!request) return;
    setUpdating(true);

    try {
      // Calculate totals from found items
      let subtotal = 0;
      request.items.forEach((item) => {
        if (item.status === 'found' || item.status === 'substituted') {
          const price = item.actual_price || item.estimated_price || 0;
          const pickup = item.pickup_fee || calculatePickupFee(item.category, price);
          subtotal += (price + pickup) * item.quantity;
        }
      });

      const tax = calculateTax(subtotal);
      const total = subtotal + tax;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          request_id: request.id,
          subtotal,
          tax_amount: tax,
          shipping_amount: 0,
          total,
          status: 'draft',
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update request with invoice_id and status
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          invoice_id: invoice.id,
          status: 'invoiced',
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      setRequest((prev) => prev ? { ...prev, invoice_id: invoice.id, status: 'invoiced' } : null);

      toast({
        title: 'Invoice created',
        description: `Invoice for $${total.toFixed(2)} has been created`,
      });

      // Navigate to the invoice
      router.push(`/admin/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to create invoice',
        variant: 'destructive',
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      quoted: 'bg-blue-500/10 text-blue-600',
      approved: 'bg-green-500/10 text-green-600',
      scheduled: 'bg-purple-500/10 text-purple-600',
      shopping: 'bg-orange-500/10 text-orange-600',
      found: 'bg-teal-500/10 text-teal-600',
      invoiced: 'bg-indigo-500/10 text-indigo-600',
      paid: 'bg-emerald-500/10 text-emerald-600',
      shipped: 'bg-cyan-500/10 text-cyan-600',
      delivered: 'bg-gray-500/10 text-gray-600',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600';
  };

  const getItemStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600',
      found: 'bg-green-500/10 text-green-600',
      not_found: 'bg-red-500/10 text-red-600',
      substituted: 'bg-blue-500/10 text-blue-600',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600';
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
        <p className="text-muted-foreground">Request not found</p>
        <Link href="/admin/requests">
          <Button variant="outline" className="mt-4">Back to Requests</Button>
        </Link>
      </div>
    );
  }

  const currentStatusIndex = statusFlow.indexOf(request.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/requests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold text-foreground">
                Request
              </h1>
              <Badge className={getStatusColor(request.status)}>
                {request.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {new Date(request.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {request.status === 'pending' && (
            <Button variant="gold" onClick={() => setShowQuoteDialog(true)}>
              Generate Quote
            </Button>
          )}
          {request.status === 'quoted' && (
            <Button variant="gold" onClick={() => updateStatus('approved')}>
              Mark Approved
            </Button>
          )}
          {request.status === 'found' && !request.invoice_id && (
            <Button variant="gold" onClick={createInvoice} disabled={updating}>
              {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
              Create Invoice
            </Button>
          )}
          {request.invoice_id && (
            <Link href={`/admin/invoices/${request.invoice_id}`}>
              <Button variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                View Invoice
              </Button>
            </Link>
          )}
          {request.status === 'paid' && (
            <Link href={`/admin/shipments/new?request=${request.id}`}>
              <Button variant="gold">
                <Truck className="w-4 h-4 mr-2" />
                Create Shipment
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Status Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {statusFlow.map((status, index) => {
              const isComplete = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              return (
                <div key={status} className="flex items-center">
                  <div className="flex flex-col items-center min-w-[80px]">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isComplete
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-gold text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isComplete ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-xs font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-xs mt-1 capitalize ${
                        isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  {index < statusFlow.length - 1 && (
                    <div
                      className={`w-8 h-0.5 mx-1 ${
                        index < currentStatusIndex ? 'bg-green-500' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/admin/customers/${request.customer.id}`} className="hover:underline">
              <p className="font-medium">{request.customer.name}</p>
            </Link>
            <p className="text-sm text-muted-foreground">{request.customer.email}</p>
            {request.customer.phone && (
              <p className="text-sm text-muted-foreground">{request.customer.phone}</p>
            )}
          </CardContent>
        </Card>

        {/* Quote Total */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Quote Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            {request.quoted_total ? (
              <p className="text-2xl font-bold text-green-600">
                ${request.quoted_total.toFixed(2)}
              </p>
            ) : (
              <p className="text-muted-foreground">Not quoted yet</p>
            )}
          </CardContent>
        </Card>

        {/* Items Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{request.items.length}</p>
            <p className="text-sm text-muted-foreground">
              {request.items.filter((i) => i.status === 'found').length} found
            </p>
          </CardContent>
        </Card>
      </div>

      {request.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{request.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle>Request Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.items.map((item, index) => (
            <div key={item.id} className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{item.name}</h3>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.park}
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.category.replace('_', ' ')}
                    </Badge>
                    {item.is_specialty && (
                      <Badge variant="secondary" className="text-xs">Specialty</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Qty: {item.quantity}</span>
                    {item.reference_url && (
                      <a
                        href={item.reference_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-gold hover:underline"
                      >
                        Reference <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {/* Location Tags */}
                  <div className="mt-3">
                    <LocationPicker itemId={item.id} itemPark={item.park} />
                  </div>
                </div>
                <Select
                  value={item.status}
                  onValueChange={(v) => updateItemStatus(item.id, v)}
                >
                  <SelectTrigger className={`w-[140px] ${getItemStatusColor(item.status)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {itemStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Photo Section with Upload */}
              <div className="mt-4 p-4 rounded-lg bg-background border">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Reference Images (Customer's requested item) */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Customer Reference</span>
                      {item.reference_images && item.reference_images.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {item.reference_images.length}
                        </Badge>
                      )}
                    </div>
                    <ImageUploader
                      images={item.reference_images || []}
                      onImagesChange={(images) => updateItemImages(item.id, 'reference_images', images)}
                      folder="reference-images"
                      maxImages={5}
                      compact
                    />
                  </div>

                  {/* Found Images (Shopper's proof photos) */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Found Photos</span>
                      {item.found_images && item.found_images.length > 0 && (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                          {item.found_images.length}
                        </Badge>
                      )}
                    </div>
                    <ImageUploader
                      images={item.found_images || []}
                      onImagesChange={(images) => updateItemImages(item.id, 'found_images', images)}
                      folder="found-images"
                      maxImages={5}
                      compact
                      showCamera
                    />
                    {item.found_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Found {new Date(item.found_at).toLocaleDateString()} at {new Date(item.found_at).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Receipt Image */}
                {item.receipt_image && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Receipt</span>
                    </div>
                    <ImageGallery images={[item.receipt_image]} thumbnailSize="sm" />
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs">Estimated Price</Label>
                  <p className="text-sm font-medium">
                    {item.estimated_price ? `$${item.estimated_price.toFixed(2)}` : '—'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Actual Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingPrices[item.id]?.actual || ''}
                    onChange={(e) =>
                      setEditingPrices((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], actual: e.target.value },
                      }))
                    }
                    onBlur={() => saveItemPrices(item.id)}
                    placeholder="0.00"
                    className="h-8"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Pickup Fee</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingPrices[item.id]?.pickup || ''}
                    onChange={(e) =>
                      setEditingPrices((prev) => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], pickup: e.target.value },
                      }))
                    }
                    onBlur={() => saveItemPrices(item.id)}
                    placeholder="0.00"
                    className="h-8"
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quote Dialog */}
      <AlertDialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Quote</AlertDialogTitle>
            <AlertDialogDescription>
              This will calculate the total based on actual prices and pickup fees, add {(FLORIDA_TAX_RATE * 100).toFixed(1)}% Florida tax, and update the request status to "Quoted".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-2 text-sm">
              {request.items.map((item) => {
                const price = parseFloat(editingPrices[item.id]?.actual || '0') || item.actual_price || item.estimated_price || 0;
                const pickup = parseFloat(editingPrices[item.id]?.pickup || '0') || item.pickup_fee || calculatePickupFee(item.category, price);
                const lineTotal = (price + pickup) * item.quantity;
                return (
                  <div key={item.id} className="flex justify-between">
                    <span>{item.name} (x{item.quantity})</span>
                    <span>${lineTotal.toFixed(2)}</span>
                  </div>
                );
              })}
              <Separator className="my-2" />
              {(() => {
                let subtotal = 0;
                request.items.forEach((item) => {
                  const price = parseFloat(editingPrices[item.id]?.actual || '0') || item.actual_price || item.estimated_price || 0;
                  const pickup = parseFloat(editingPrices[item.id]?.pickup || '0') || item.pickup_fee || calculatePickupFee(item.category, price);
                  subtotal += (price + pickup) * item.quantity;
                });
                const tax = calculateTax(subtotal);
                return (
                  <>
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax ({(FLORIDA_TAX_RATE * 100).toFixed(1)}%)</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2">
                      <span>Total</span>
                      <span>${(subtotal + tax).toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generateQuote}>Generate Quote</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
