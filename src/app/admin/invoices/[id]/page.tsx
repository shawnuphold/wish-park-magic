"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/lib/utils/dates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Send,
  DollarSign,
  User,
  Calendar,
  ExternalLink,
  Loader2,
  XCircle,
  CheckCircle,
  Copy,
  Link as LinkIcon,
  CreditCard,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useToast } from '@/hooks/use-toast';

interface InvoiceItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  pickup_fee: number;
  shipping_fee: number;
  custom_fee_label?: string;
  custom_fee_amount: number;
  notes?: string;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  paypal_invoice_id: string | null;
  stripe_invoice_id: string | null;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'refunded';
  payment_method: 'paypal' | 'stripe' | 'manual' | null;
  payment_reference: string | null;
  notes: string | null;
  due_date: string | null;
  sent_at: string | null;
  created_at: string;
  paid_at: string | null;
  paypal_transaction_id: string | null;
  request: {
    id: string;
    notes: string | null;
    customer: {
      name: string;
      email: string;
      phone: string | null;
    };
  } | null;
  items: InvoiceItem[];
}

const defaultItem: Omit<InvoiceItem, 'id'> = {
  name: '',
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_amount: 0,
  pickup_fee: 0,
  shipping_fee: 0,
  custom_fee_label: '',
  custom_fee_amount: 0,
  notes: '',
};

export default function InvoiceDetailPage() {
  const { id } = useParams() as { id: string };
  const { toast } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'paypal' | 'stripe' | 'manual'>('manual');
  const [paymentReference, setPaymentReference] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Edit item state
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  // Delete item state
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Add item state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItem, setNewItem] = useState<Omit<InvoiceItem, 'id'>>(defaultItem);

  // CC fee state
  const [ccFeeEnabled, setCcFeeEnabled] = useState(false);
  const [ccFeePercentage, setCcFeePercentage] = useState(3.0);
  const [ccFeeManualAmount, setCcFeeManualAmount] = useState<number | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      // Fetch invoice with request info
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          *,
          request:requests!invoices_request_id_fkey(
            id,
            notes,
            customer:customers(name, email, phone)
          )
        `)
        .eq('id', id)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch invoice items
      const { data: itemsData, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('created_at', { ascending: true });

      // If invoice_items table doesn't exist or has no items, fall back to request_items
      let items: InvoiceItem[] = [];
      if (!itemsError && itemsData && itemsData.length > 0) {
        items = itemsData.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: Number(item.unit_price) || 0,
          tax_amount: Number(item.tax_amount) || 0,
          pickup_fee: Number(item.pickup_fee) || 0,
          shipping_fee: Number(item.shipping_fee) || 0,
          custom_fee_label: item.custom_fee_label || '',
          custom_fee_amount: Number(item.custom_fee_amount) || 0,
          notes: item.notes || '',
        }));
      } else if (invoiceData.request) {
        // Fall back to request_items if no invoice_items exist
        const { data: requestItems } = await supabase
          .from('request_items')
          .select('*')
          .eq('request_id', invoiceData.request.id);

        if (requestItems) {
          items = requestItems.map(item => ({
            id: item.id,
            name: item.name,
            description: '',
            quantity: item.quantity || 1,
            unit_price: Number(item.actual_price || item.estimated_price) || 0,
            tax_amount: 0,
            pickup_fee: Number(item.pickup_fee) || 0,
            shipping_fee: 0,
            custom_fee_label: '',
            custom_fee_amount: 0,
            notes: '',
          }));
        }
      }

      setInvoice({
        ...invoiceData,
        status: invoiceData.status as Invoice['status'],
        request: invoiceData.request as Invoice['request'],
        invoice_number: invoiceData.invoice_number || null,
        stripe_invoice_id: invoiceData.stripe_invoice_id || null,
        payment_method: (invoiceData.payment_method as Invoice['payment_method']) || null,
        payment_reference: invoiceData.payment_reference || null,
        notes: invoiceData.notes || null,
        due_date: invoiceData.due_date || null,
        sent_at: invoiceData.sent_at || null,
        items,
      });
      setInvoiceNotes(invoiceData.notes || '');
      setCcFeeEnabled(invoiceData.cc_fee_enabled || false);
      setCcFeePercentage(invoiceData.cc_fee_percentage ?? 3.0);
      setCcFeeManualAmount(invoiceData.cc_fee_manual_amount ?? null);
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to load invoice',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateItemTotal = (item: InvoiceItem) => {
    return (item.unit_price * item.quantity) +
      item.tax_amount +
      item.pickup_fee +
      item.shipping_fee +
      (item.custom_fee_amount || 0);
  };

  const subtotalBeforeCC = invoice
    ? invoice.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
    : 0;
  const calculatedCcFee = subtotalBeforeCC * (ccFeePercentage / 100);
  const actualCcFee = ccFeeEnabled
    ? (ccFeeManualAmount !== null ? ccFeeManualAmount : calculatedCcFee)
    : 0;

  const calculateInvoiceTotal = () => {
    return subtotalBeforeCC + actualCcFee;
  };

  const persistInvoiceTotals = async (items: InvoiceItem[], ccFee?: number) => {
    if (!invoice) return;
    const itemsTotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const fee = ccFee !== undefined ? ccFee : actualCcFee;
    const total = itemsTotal + fee;
    const subtotal = items.reduce((sum, i) => sum + (i.unit_price * i.quantity), 0);
    const taxAmount = items.reduce((sum, i) => sum + i.tax_amount, 0);
    const shippingAmount = items.reduce((sum, i) => sum + i.shipping_fee, 0);

    await supabase
      .from('invoices')
      .update({
        total,
        subtotal,
        tax_amount: taxAmount,
        shipping_amount: shippingAmount,
        cc_fee_enabled: ccFeeEnabled,
        cc_fee_percentage: ccFeePercentage,
        cc_fee_manual_amount: ccFeeManualAmount,
        cc_fee_amount: fee,
      } as any)
      .eq('id', invoice.id);
  };

  const saveItem = async (item: InvoiceItem | Omit<InvoiceItem, 'id'>, isNew: boolean = false) => {
    if (!invoice) return;
    setSavingItem(true);

    // Auto-calculate tax at 6.5% of item subtotal
    const autoTax = Math.round((item.quantity || 1) * (item.unit_price || 0) * 0.065 * 100) / 100;

    try {
      if (isNew) {
        // Insert new item
        const { data, error } = await supabase
          .from('invoice_items')
          .insert({
            invoice_id: invoice.id,
            name: item.name,
            description: item.description || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_amount: autoTax,
            pickup_fee: item.pickup_fee,
            shipping_fee: item.shipping_fee,
            custom_fee_label: item.custom_fee_label || null,
            custom_fee_amount: item.custom_fee_amount || 0,
            notes: item.notes || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setInvoice(prev => prev ? {
          ...prev,
          items: [...prev.items, {
            id: data.id,
            name: data.name,
            description: data.description || '',
            quantity: data.quantity,
            unit_price: Number(data.unit_price),
            tax_amount: Number(data.tax_amount),
            pickup_fee: Number(data.pickup_fee),
            shipping_fee: Number(data.shipping_fee),
            custom_fee_label: data.custom_fee_label || '',
            custom_fee_amount: Number(data.custom_fee_amount) || 0,
            notes: data.notes || '',
          }],
        } : null);

        setShowAddDialog(false);
        setNewItem(defaultItem);
        toast({ title: 'Item added' });
      } else {
        // Update existing item
        const fullItem = item as InvoiceItem;
        const { error } = await supabase
          .from('invoice_items')
          .update({
            name: fullItem.name,
            description: fullItem.description || null,
            quantity: fullItem.quantity,
            unit_price: fullItem.unit_price,
            tax_amount: autoTax,
            pickup_fee: fullItem.pickup_fee,
            shipping_fee: fullItem.shipping_fee,
            custom_fee_label: fullItem.custom_fee_label || null,
            custom_fee_amount: fullItem.custom_fee_amount || 0,
            notes: fullItem.notes || null,
          })
          .eq('id', fullItem.id);

        if (error) throw error;

        // Update local state
        setInvoice(prev => prev ? {
          ...prev,
          items: prev.items.map(i => i.id === fullItem.id ? fullItem : i),
        } : null);

        setShowEditDialog(false);
        setEditingItem(null);
        toast({ title: 'Item updated' });
      }

      // Persist totals to DB so customer-facing view shows correct amounts
      const currentItems = invoice.items.slice();
      if (isNew) {
        currentItems.push(item as InvoiceItem);
      } else {
        const idx = currentItems.findIndex(i => i.id === (item as InvoiceItem).id);
        if (idx >= 0) currentItems[idx] = item as InvoiceItem;
      }
      await persistInvoiceTotals(currentItems);
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Error',
        description: 'Failed to save item',
        variant: 'destructive',
      });
    } finally {
      setSavingItem(false);
    }
  };

  const deleteItem = async () => {
    if (!invoice || !deletingItemId) return;

    try {
      const { error } = await supabase
        .from('invoice_items')
        .delete()
        .eq('id', deletingItemId);

      if (error) throw error;

      // Update local state
      setInvoice(prev => prev ? {
        ...prev,
        items: prev.items.filter(i => i.id !== deletingItemId),
      } : null);

      // Persist updated totals to DB
      const remainingItems = invoice.items.filter(i => i.id !== deletingItemId);
      await persistInvoiceTotals(remainingItems);

      setShowDeleteDialog(false);
      setDeletingItemId(null);
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

  const addFeeToItem = async (itemId: string, feeType: 'tax' | 'pickup' | 'shipping' | 'custom') => {
    const item = invoice?.items.find(i => i.id === itemId);
    if (!item) return;

    if (feeType === 'custom') {
      const label = prompt('Enter custom fee label:');
      if (!label) return;
      const amount = parseFloat(prompt('Enter amount:') || '0');
      if (isNaN(amount)) return;

      await saveItem({ ...item, custom_fee_label: label, custom_fee_amount: amount });
    } else {
      // Open edit dialog with focus on the specific fee
      setEditingItem(item);
      setShowEditDialog(true);
    }
  };

  const sendInvoice = async () => {
    if (!invoice) return;
    setSending(true);

    try {
      const response = await fetch('/api/payments/paypal/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invoice');
      }

      setInvoice((prev) => prev ? { ...prev, status: 'sent' } : null);

      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      if (invoice.request) {
        await supabase
          .from('requests')
          .update({ status: 'invoiced' })
          .eq('id', invoice.request.id);
      }

      toast({
        title: 'Invoice sent',
        description: 'The invoice has been sent to the customer via PayPal.',
      });
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invoice',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const cancelInvoice = async () => {
    if (!invoice) return;
    setCancelling(true);

    try {
      const response = await fetch('/api/paypal/cancel-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel invoice');
      }

      setInvoice((prev) => prev ? { ...prev, status: 'cancelled' } : null);

      await supabase
        .from('invoices')
        .update({ status: 'cancelled' })
        .eq('id', invoice.id);

      toast({
        title: 'Invoice cancelled',
        description: 'The invoice has been cancelled.',
      });
    } catch (error: any) {
      console.error('Error cancelling invoice:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel invoice',
        variant: 'destructive',
      });
    } finally {
      setCancelling(false);
    }
  };

  const markAsPaid = async () => {
    if (!invoice) return;

    try {
      const now = new Date().toISOString();

      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: now,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
        } as any)
        .eq('id', invoice.id);

      if (invoice.request) {
        await supabase
          .from('requests')
          .update({ status: 'paid' })
          .eq('id', invoice.request.id);
      }

      setInvoice((prev) =>
        prev
          ? {
              ...prev,
              status: 'paid',
              paid_at: now,
              payment_method: paymentMethod,
              payment_reference: paymentReference || null,
            }
          : null
      );

      setShowPaymentDialog(false);
      setPaymentReference('');

      toast({
        title: 'Invoice marked as paid',
        description: 'The invoice status has been updated.',
      });
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice status',
        variant: 'destructive',
      });
    }
  };

  const copyInvoiceLink = async () => {
    const link = `${window.location.origin}/invoice/${invoice?.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link copied',
        description: 'Invoice link copied to clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard.',
        variant: 'destructive',
      });
    }
  };

  const markAsSent = async () => {
    if (!invoice) return;

    try {
      const now = new Date().toISOString();

      await supabase
        .from('invoices')
        .update({ status: 'sent', sent_at: now } as any)
        .eq('id', invoice.id);

      setInvoice((prev) => (prev ? { ...prev, status: 'sent', sent_at: now } : null));

      toast({
        title: 'Invoice marked as sent',
        description: 'The invoice status has been updated.',
      });
    } catch (error) {
      console.error('Error marking as sent:', error);
      toast({
        title: 'Error',
        description: 'Failed to update invoice status',
        variant: 'destructive',
      });
    }
  };

  const saveNotes = async () => {
    if (!invoice) return;

    try {
      await supabase
        .from('invoices')
        .update({ notes: invoiceNotes } as any)
        .eq('id', invoice.id);

      setInvoice((prev) => (prev ? { ...prev, notes: invoiceNotes } : null));

      toast({
        title: 'Notes saved',
      });
    } catch (error) {
      console.error('Error saving notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-500/10 text-gray-600',
      sent: 'bg-blue-500/10 text-blue-600',
      paid: 'bg-green-500/10 text-green-600',
      cancelled: 'bg-red-500/10 text-red-600',
      refunded: 'bg-orange-500/10 text-orange-600',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600';
  };

  const canEdit = invoice?.status === 'draft';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Invoice not found</p>
        <Link href="/admin/invoices">
          <Button variant="outline" className="mt-4">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {invoice.invoice_number || 'Invoice'}
              </h1>
              <Badge className={getStatusColor(invoice.status)}>
                {invoice.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {formatDate(invoice.created_at)}
              {invoice.sent_at && ` • Sent ${formatDate(invoice.sent_at)}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={copyInvoiceLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>

          {invoice.status === 'draft' && (
            <>
              <Button variant="outline" onClick={markAsSent}>
                <Send className="w-4 h-4 mr-2" />
                Mark as Sent
              </Button>
              <Button variant="gold" onClick={sendInvoice} disabled={sending}>
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send via PayPal
              </Button>
            </>
          )}
          {invoice.status === 'sent' && (
            <>
              <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogTrigger asChild>
                  <Button variant="gold">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Record Payment</DialogTitle>
                    <DialogDescription>
                      Enter payment details to mark this invoice as paid.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paypal">PayPal</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="manual">Manual (Cash, Venmo, etc.)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Reference (optional)</Label>
                      <Input
                        placeholder="Transaction ID, confirmation number, etc."
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                      Cancel
                    </Button>
                    <Button variant="gold" onClick={markAsPaid}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Paid
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={cancelInvoice}
                disabled={cancelling}
                className="text-destructive"
              >
                {cancelling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Cancel
              </Button>
            </>
          )}
          {invoice.status === 'paid' && invoice.request && (
            <Link href={`/admin/shipments/new?request=${invoice.request.id}`}>
              <Button variant="gold">Create Shipment</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{invoice.request?.customer?.name || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">{invoice.request?.customer?.email || 'N/A'}</p>
            {invoice.request?.customer?.phone && (
              <p className="text-sm text-muted-foreground">{invoice.request?.customer?.phone}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${calculateInvoiceTotal().toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {invoice.status === 'paid' ? 'Paid On' : 'Created'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg">
              {formatDate(invoice.paid_at || invoice.created_at)}
            </p>
          </CardContent>
        </Card>
      </div>

      {(invoice.payment_method || invoice.paypal_invoice_id) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invoice.payment_method && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Method</span>
                <Badge variant="outline" className="capitalize">
                  {invoice.payment_method}
                </Badge>
              </div>
            )}
            {invoice.payment_reference && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Reference</span>
                <span className="font-mono text-sm">{invoice.payment_reference}</span>
              </div>
            )}
            {invoice.paypal_invoice_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PayPal Invoice ID</span>
                <span className="font-mono text-sm">{invoice.paypal_invoice_id}</span>
              </div>
            )}
            {invoice.paypal_transaction_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">PayPal Transaction</span>
                <span className="font-mono text-sm">{invoice.paypal_transaction_id}</span>
              </div>
            )}
            {invoice.stripe_invoice_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stripe Invoice ID</span>
                <span className="font-mono text-sm">{invoice.stripe_invoice_id}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="w-4 h-4" />
            Customer Invoice Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={typeof window !== 'undefined' ? `${window.location.origin}/invoice/${invoice.id}` : `/invoice/${invoice.id}`}
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copyInvoiceLink}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link with your customer to view the invoice.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Invoice Items</CardTitle>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Table Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-3">Item</div>
              <div className="col-span-1 text-center">Qty</div>
              <div className="col-span-1 text-right">Price</div>
              <div className="col-span-1 text-right">Tax (6.5%)</div>
              <div className="col-span-1 text-right">Pickup</div>
              <div className="col-span-1 text-right">Ship</div>
              <div className="col-span-1 text-right">Custom</div>
              <div className="col-span-1 text-right">Subtotal</div>
              <div className="col-span-2 text-right">Actions</div>
            </div>

            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 py-3 border-b items-center">
                <div className="md:col-span-3">
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                  {item.custom_fee_label && (
                    <p className="text-xs text-blue-600">+ {item.custom_fee_label}</p>
                  )}
                </div>
                <div className="md:col-span-1 text-center">
                  <span className="md:hidden text-muted-foreground text-xs">Qty: </span>
                  {item.quantity}
                </div>
                <div className="md:col-span-1 text-right">
                  <span className="md:hidden text-muted-foreground text-xs">Price: </span>
                  ${item.unit_price.toFixed(2)}
                </div>
                <div className="md:col-span-1 text-right">
                  <span className="md:hidden text-muted-foreground text-xs">Tax: </span>
                  {item.tax_amount > 0 ? `$${item.tax_amount.toFixed(2)}` : '-'}
                </div>
                <div className="md:col-span-1 text-right">
                  <span className="md:hidden text-muted-foreground text-xs">Pickup: </span>
                  {item.pickup_fee > 0 ? `$${item.pickup_fee.toFixed(2)}` : '-'}
                </div>
                <div className="md:col-span-1 text-right">
                  <span className="md:hidden text-muted-foreground text-xs">Ship: </span>
                  {item.shipping_fee > 0 ? `$${item.shipping_fee.toFixed(2)}` : '-'}
                </div>
                <div className="md:col-span-1 text-right">
                  <span className="md:hidden text-muted-foreground text-xs">Custom: </span>
                  {item.custom_fee_amount > 0 ? `$${item.custom_fee_amount.toFixed(2)}` : '-'}
                </div>
                <div className="md:col-span-1 text-right font-medium">
                  <span className="md:hidden text-muted-foreground text-xs">Subtotal: </span>
                  ${calculateItemTotal(item).toFixed(2)}
                </div>
                <div className="md:col-span-2 flex justify-end gap-1">
                  {canEdit && (
                    <>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Plus className="w-3 h-3 mr-1" />
                            Fee
                            <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => addFeeToItem(item.id, 'tax')}>
                            Add Tax
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addFeeToItem(item.id, 'pickup')}>
                            Add Pickup Fee
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addFeeToItem(item.id, 'shipping')}>
                            Add Shipping Fee
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addFeeToItem(item.id, 'custom')}>
                            Add Custom Fee...
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item);
                          setShowEditDialog(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingItemId(item.id);
                          setShowDeleteDialog(true);
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {invoice.items.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No items yet.{' '}
                {canEdit && (
                  <button
                    onClick={() => setShowAddDialog(true)}
                    className="text-gold hover:underline"
                  >
                    Add an item
                  </button>
                )}
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items Subtotal</span>
                <span>
                  ${invoice.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(2)}
                </span>
              </div>
              {invoice.items.reduce((sum, item) => sum + (item.tax_amount || 0), 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (6.5%)</span>
                  <span>
                    ${invoice.items.reduce((sum, item) => sum + (item.tax_amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              {invoice.items.reduce((sum, item) => sum + (item.pickup_fee || 0), 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pickup Fees</span>
                  <span>
                    ${invoice.items.reduce((sum, item) => sum + (item.pickup_fee || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              {invoice.items.reduce((sum, item) => sum + (item.shipping_fee || 0), 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    ${invoice.items.reduce((sum, item) => sum + (item.shipping_fee || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              {invoice.items.reduce((sum, item) => sum + (item.custom_fee_amount || 0), 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Custom Fees</span>
                  <span>
                    ${invoice.items.reduce((sum, item) => sum + (item.custom_fee_amount || 0), 0).toFixed(2)}
                  </span>
                </div>
              )}
              {/* CC Processing Fee */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ccFeeEnabledEdit"
                    checked={ccFeeEnabled}
                    onChange={async (e) => {
                      setCcFeeEnabled(e.target.checked);
                      const fee = e.target.checked
                        ? (ccFeeManualAmount !== null ? ccFeeManualAmount : subtotalBeforeCC * (ccFeePercentage / 100))
                        : 0;
                      if (invoice) await persistInvoiceTotals(invoice.items, fee);
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="ccFeeEnabledEdit" className="text-sm font-medium cursor-pointer">
                    Add CC Processing Fee
                  </label>
                </div>

                {ccFeeEnabled && (
                  <div className="ml-5 space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Percentage:</span>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={ccFeePercentage}
                        onChange={(e) => setCcFeePercentage(parseFloat(e.target.value) || 0)}
                        onBlur={() => invoice && persistInvoiceTotals(invoice.items)}
                        className="w-16 h-7 text-sm"
                      />
                      <span className="text-muted-foreground">% = ${calculatedCcFee.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Or manual:</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ccFeeManualAmount ?? ''}
                        onChange={(e) => setCcFeeManualAmount(e.target.value ? parseFloat(e.target.value) : null)}
                        onBlur={() => invoice && persistInvoiceTotals(invoice.items)}
                        placeholder="Use %"
                        className="w-20 h-7 text-sm"
                      />
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>CC Fee:</span>
                      <span>
                        ${actualCcFee.toFixed(2)}
                        {ccFeeManualAmount !== null && (
                          <span className="text-xs text-muted-foreground ml-1">(manual)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${calculateInvoiceTotal().toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.request && (
        <div className="flex justify-center">
          <Link href={`/admin/requests/${invoice.request.id}`}>
            <Button variant="outline">
              View Request
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      )}

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update the item details and fees.
            </DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Input
                  value={editingItem.description || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={editingItem.quantity}
                    onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.unit_price}
                    onChange={(e) => setEditingItem({ ...editingItem, unit_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <Separator />
              <p className="text-sm font-medium">Fees</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tax (6.5% auto)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(Math.round((editingItem.quantity || 1) * (editingItem.unit_price || 0) * 0.065 * 100) / 100) || ''}
                    readOnly
                    className="bg-muted"
                    title="Auto-calculated: subtotal × 6.5%"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pickup Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.pickup_fee}
                    onChange={(e) => setEditingItem({ ...editingItem, pickup_fee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.shipping_fee}
                    onChange={(e) => setEditingItem({ ...editingItem, shipping_fee: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Custom Fee ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.custom_fee_amount}
                    onChange={(e) => setEditingItem({ ...editingItem, custom_fee_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Custom Fee Label (if amount > 0)</Label>
                <Input
                  placeholder="e.g., Rush fee, Insurance, etc."
                  value={editingItem.custom_fee_label || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, custom_fee_label: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={editingItem.notes || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="flex justify-between font-medium">
                  <span>Line Total</span>
                  <span>${calculateItemTotal(editingItem).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={() => editingItem && saveItem(editingItem)}
              disabled={savingItem}
            >
              {savingItem ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a new item to the invoice.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Item name"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={newItem.description || ''}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.unit_price || ''}
                  onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <Separator />
            <p className="text-sm font-medium">Fees (optional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax (6.5% auto)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(Math.round((newItem.quantity || 1) * (newItem.unit_price || 0) * 0.065 * 100) / 100) || ''}
                  readOnly
                  className="bg-muted"
                  title="Auto-calculated: subtotal × 6.5%"
                />
              </div>
              <div className="space-y-2">
                <Label>Pickup Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.pickup_fee || ''}
                  onChange={(e) => setNewItem({ ...newItem, pickup_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Shipping Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.shipping_fee || ''}
                  onChange={(e) => setNewItem({ ...newItem, shipping_fee: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Custom Fee ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.custom_fee_amount || ''}
                  onChange={(e) => setNewItem({ ...newItem, custom_fee_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Custom Fee Label (if amount > 0)</Label>
              <Input
                placeholder="e.g., Rush fee, Insurance, etc."
                value={newItem.custom_fee_label || ''}
                onChange={(e) => setNewItem({ ...newItem, custom_fee_label: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setNewItem(defaultItem);
            }}>
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={() => saveItem(newItem, true)}
              disabled={savingItem || !newItem.name}
            >
              {savingItem ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingItemId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
