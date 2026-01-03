"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
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
  FileText,
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
import { useToast } from '@/hooks/use-toast';

interface InvoiceItem {
  name: string;
  quantity: number;
  actual_price: number;
  pickup_fee: number;
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
    items: InvoiceItem[];
  };
}

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

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          request:requests(
            id,
            notes,
            customer:customers(name, email, phone),
            items:request_items(name, quantity, actual_price, pickup_fee)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // Cast to any to handle new fields that may not exist in DB yet
      const invoiceData = data as any;
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
      });
      // Initialize notes for editing
      setInvoiceNotes(invoiceData.notes || '');
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

  const sendInvoice = async () => {
    if (!invoice) return;
    setSending(true);

    try {
      const response = await fetch('/api/paypal/send-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send invoice');
      }

      // Update local state
      setInvoice((prev) => prev ? { ...prev, status: 'sent' } : null);

      // Update database
      await supabase
        .from('invoices')
        .update({ status: 'sent' })
        .eq('id', invoice.id);

      // Update request status
      await supabase
        .from('requests')
        .update({ status: 'invoiced' })
        .eq('id', invoice.request.id);

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

      // Update local state and database
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

      await supabase
        .from('requests')
        .update({ status: 'paid' })
        .eq('id', invoice.request.id);

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
              Created {new Date(invoice.created_at).toLocaleDateString()}
              {invoice.sent_at && ` • Sent ${new Date(invoice.sent_at).toLocaleDateString()}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Copy Link - Always available */}
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
          {invoice.status === 'paid' && (
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
            <p className="font-medium">{invoice.request?.customer?.name}</p>
            <p className="text-sm text-muted-foreground">{invoice.request?.customer?.email}</p>
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
              ${invoice.total.toFixed(2)}
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
              {new Date(invoice.paid_at || invoice.created_at).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Details - Show when paid or has payment info */}
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

      {/* Invoice Link */}
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
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoice.request?.items?.map((item, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Qty: {item.quantity} × ${(item.actual_price || 0).toFixed(2)} + ${(item.pickup_fee || 0).toFixed(2)} pickup
                  </p>
                </div>
                <p className="font-medium">
                  ${(((item.actual_price || 0) + (item.pickup_fee || 0)) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))}

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${invoice.tax_amount.toFixed(2)}</span>
              </div>
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${invoice.shipping_amount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Link href={`/admin/requests/${invoice.request?.id}`}>
          <Button variant="outline">
            View Request
            <ExternalLink className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
