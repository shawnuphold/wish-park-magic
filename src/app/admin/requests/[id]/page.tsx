// Type checking enabled
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  ShoppingCart,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
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

interface ShoppingTrip {
  id: string;
  date: string;
  parks: Park[];
  status: string;
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, { actual: string; pickup: string }>>({});
  const [availableTrips, setAvailableTrips] = useState<ShoppingTrip[]>([]);
  const [assigningTrip, setAssigningTrip] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState<Partial<RequestItem>>({});
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    category: 'merchandise' as ItemCategory,
    park: 'disney' as Park,
    quantity: 1,
    notes: '',
    store_name: '',
  });
  const [savingItem, setSavingItem] = useState(false);

  useEffect(() => {
    fetchRequest();
    fetchAvailableTrips();
  }, [id]);

  const fetchAvailableTrips = async () => {
    try {
      const { data } = await supabase
        .from('shopping_trips')
        .select('id, date, parks, status')
        .in('status', ['planned', 'in_progress'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true });

      setAvailableTrips(
        data?.map((t) => ({
          ...t,
          parks: t.parks as Park[],
        })) || []
      );
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  const assignToTrip = async (tripId: string) => {
    if (!request) return;
    setAssigningTrip(true);

    try {
      const { error } = await supabase
        .from('requests')
        .update({
          shopping_trip_id: tripId,
          status: 'scheduled',
        })
        .eq('id', request.id);

      if (error) throw error;

      setRequest((prev) => prev ? { ...prev, shopping_trip_id: tripId, status: 'scheduled' } : null);
      toast({
        title: 'Request assigned',
        description: 'Request has been assigned to the shopping trip',
      });
    } catch (error) {
      console.error('Error assigning trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign trip',
        variant: 'destructive',
      });
    } finally {
      setAssigningTrip(false);
    }
  };

  const unassignFromTrip = async () => {
    if (!request) return;
    setAssigningTrip(true);

    try {
      const { error } = await supabase
        .from('requests')
        .update({
          shopping_trip_id: null,
          status: 'approved',
        })
        .eq('id', request.id);

      if (error) throw error;

      setRequest((prev) => prev ? { ...prev, shopping_trip_id: null, status: 'approved' } : null);
      toast({
        title: 'Request unassigned',
        description: 'Request has been removed from the shopping trip',
      });
    } catch (error) {
      console.error('Error unassigning trip:', error);
      toast({
        title: 'Error',
        description: 'Failed to unassign trip',
        variant: 'destructive',
      });
    } finally {
      setAssigningTrip(false);
    }
  };

  const deleteRequest = async () => {
    if (!request) return;
    setDeleting(true);

    try {
      // First delete all request items
      const { error: itemsError } = await supabase
        .from('request_items')
        .delete()
        .eq('request_id', request.id);

      if (itemsError) throw itemsError;

      // Then delete the request itself
      const { error: requestError } = await supabase
        .from('requests')
        .delete()
        .eq('id', request.id);

      if (requestError) throw requestError;

      toast({
        title: 'Request deleted',
        description: 'The request has been permanently deleted',
      });

      router.push('/admin/requests');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete request',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

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

  const startEditingItem = (item: RequestItem) => {
    setEditingItemId(item.id);
    setEditingItemData({
      name: item.name,
      category: item.category,
      park: item.park,
      quantity: item.quantity,
      notes: item.notes || '',
      store_name: item.store_name || '',
    });
  };

  const cancelEditingItem = () => {
    setEditingItemId(null);
    setEditingItemData({});
  };

  const saveItemDetails = async () => {
    if (!editingItemId || !editingItemData.name) return;
    setSavingItem(true);

    try {
      const { error } = await supabase
        .from('request_items')
        .update({
          name: editingItemData.name,
          category: editingItemData.category,
          park: editingItemData.park,
          quantity: editingItemData.quantity,
          notes: editingItemData.notes || null,
          store_name: editingItemData.store_name || null,
        })
        .eq('id', editingItemId);

      if (error) throw error;

      setRequest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === editingItemId
              ? { ...item, ...editingItemData }
              : item
          ),
        };
      });

      setEditingItemId(null);
      setEditingItemData({});
      toast({ title: 'Item updated' });
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item',
        variant: 'destructive',
      });
    } finally {
      setSavingItem(false);
    }
  };

  const addNewItem = async () => {
    if (!request || !newItemData.name) return;
    setSavingItem(true);

    try {
      const { data: newItem, error } = await supabase
        .from('request_items')
        .insert({
          request_id: request.id,
          name: newItemData.name,
          category: newItemData.category,
          park: newItemData.park,
          quantity: newItemData.quantity,
          notes: newItemData.notes || null,
          store_name: newItemData.store_name || null,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      setRequest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: [...prev.items, newItem as RequestItem],
        };
      });

      setShowAddItemDialog(false);
      setNewItemData({
        name: '',
        category: 'merchandise',
        park: 'disney',
        quantity: 1,
        notes: '',
        store_name: '',
      });
      toast({ title: 'Item added' });
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: 'Error',
        description: 'Failed to add item',
        variant: 'destructive',
      });
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('request_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setRequest((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== itemId),
        };
      });

      toast({ title: 'Item deleted' });
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete item',
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
          {(request.status === 'pending' || request.status === 'quoted') && (
            <Button variant="gold" onClick={() => updateStatus('approved')}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve for Shopping
            </Button>
          )}
          {request.status === 'pending' && (
            <Button variant="outline" onClick={() => setShowQuoteDialog(true)}>
              Generate Quote
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
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this request? This will permanently remove the request and all its items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRequest}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            <p className="text-sm text-muted-foreground">{request.customer.email || 'No email'}</p>
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

        {/* Shopping Trip Assignment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Shopping Trip
            </CardTitle>
          </CardHeader>
          <CardContent>
            {request.shopping_trip_id ? (
              <div className="space-y-2">
                <Link
                  href={`/admin/trips/${request.shopping_trip_id}`}
                  className="text-gold hover:underline font-medium"
                >
                  View Assigned Trip
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={unassignFromTrip}
                  disabled={assigningTrip}
                >
                  {assigningTrip ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}
                  Unassign
                </Button>
              </div>
            ) : request.status === 'approved' ? (
              <div className="space-y-2">
                {availableTrips.length > 0 ? (
                  <Select
                    onValueChange={assignToTrip}
                    disabled={assigningTrip}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a trip..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTrips.map((trip) => (
                        <SelectItem key={trip.id} value={trip.id}>
                          {new Date(trip.date + 'T00:00:00').toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })} - {trip.parks.join(', ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming trips</p>
                )}
                <Link href="/admin/trips/new">
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="w-3 h-3 mr-1" />
                    Plan New Trip
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {request.status === 'pending' || request.status === 'quoted'
                  ? 'Approve request first'
                  : request.status === 'scheduled' || request.status === 'shopping'
                  ? 'Trip in progress'
                  : 'Not applicable'}
              </p>
            )}
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Request Items</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setShowAddItemDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {request.items.map((item, index) => (
            <div key={item.id} className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {editingItemId === item.id ? (
                    /* Editing Mode */
                    <div className="space-y-3">
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label className="text-xs">Item Name</Label>
                          <Input
                            value={editingItemData.name || ''}
                            onChange={(e) => setEditingItemData({ ...editingItemData, name: e.target.value })}
                            placeholder="Item name"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={editingItemData.quantity || 1}
                            onChange={(e) => setEditingItemData({ ...editingItemData, quantity: parseInt(e.target.value) || 1 })}
                            className="mt-1"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <Label className="text-xs">Park</Label>
                          <Select
                            value={editingItemData.park}
                            onValueChange={(v) => setEditingItemData({ ...editingItemData, park: v as Park })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="disney">Disney</SelectItem>
                              <SelectItem value="universal">Universal</SelectItem>
                              <SelectItem value="seaworld">SeaWorld</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Category</Label>
                          <Select
                            value={editingItemData.category}
                            onValueChange={(v) => setEditingItemData({ ...editingItemData, category: v as ItemCategory })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="merchandise">Merchandise</SelectItem>
                              <SelectItem value="apparel">Apparel</SelectItem>
                              <SelectItem value="accessories">Accessories</SelectItem>
                              <SelectItem value="collectibles">Collectibles</SelectItem>
                              <SelectItem value="home_decor">Home Decor</SelectItem>
                              <SelectItem value="toys">Toys</SelectItem>
                              <SelectItem value="food">Food</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Store Name (optional)</Label>
                        <Input
                          value={editingItemData.store_name || ''}
                          onChange={(e) => setEditingItemData({ ...editingItemData, store_name: e.target.value })}
                          placeholder="e.g., Emporium, World of Disney"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Notes (optional)</Label>
                        <Textarea
                          value={editingItemData.notes || ''}
                          onChange={(e) => setEditingItemData({ ...editingItemData, notes: e.target.value })}
                          placeholder="Size, color, specific details..."
                          className="mt-1"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveItemDetails} disabled={savingItem}>
                          {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelEditingItem}>
                          <X className="w-4 h-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* View Mode */
                    <>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-auto"
                          onClick={() => startEditingItem(item)}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => deleteItem(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Qty: {item.quantity}</span>
                        {item.store_name && <span>Store: {item.store_name}</span>}
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
                      {item.notes && (
                        <p className="text-sm text-muted-foreground mt-1">Note: {item.notes}</p>
                      )}
                    </>
                  )}
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

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item to Request</DialogTitle>
            <DialogDescription>
              Add a new item to this shopping request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Item Name *</Label>
              <Input
                value={newItemData.name}
                onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                placeholder="e.g., Spirit Jersey, Mickey Ears"
                className="mt-1"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Park</Label>
                <Select
                  value={newItemData.park}
                  onValueChange={(v) => setNewItemData({ ...newItemData, park: v as Park })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disney">Disney</SelectItem>
                    <SelectItem value="universal">Universal</SelectItem>
                    <SelectItem value="seaworld">SeaWorld</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={newItemData.category}
                  onValueChange={(v) => setNewItemData({ ...newItemData, category: v as ItemCategory })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchandise">Merchandise</SelectItem>
                    <SelectItem value="apparel">Apparel</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="collectibles">Collectibles</SelectItem>
                    <SelectItem value="home_decor">Home Decor</SelectItem>
                    <SelectItem value="toys">Toys</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItemData.quantity}
                  onChange={(e) => setNewItemData({ ...newItemData, quantity: parseInt(e.target.value) || 1 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Store Name (optional)</Label>
                <Input
                  value={newItemData.store_name}
                  onChange={(e) => setNewItemData({ ...newItemData, store_name: e.target.value })}
                  placeholder="e.g., Emporium"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={newItemData.notes}
                onChange={(e) => setNewItemData({ ...newItemData, notes: e.target.value })}
                placeholder="Size, color, specific details..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddItemDialog(false)}>
              Cancel
            </Button>
            <Button onClick={addNewItem} disabled={!newItemData.name || savingItem}>
              {savingItem ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
