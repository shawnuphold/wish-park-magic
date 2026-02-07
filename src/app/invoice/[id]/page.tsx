"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Clock,
  XCircle,
  Printer,
  Download,
} from 'lucide-react';

interface InvoiceItem {
  name: string;
  description?: string | null;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  pickup_fee: number;
  shipping_fee: number;
  custom_fee_label?: string | null;
  custom_fee_amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string | null;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'cancelled' | 'refunded';
  created_at: string;
  paid_at: string | null;
  due_date: string | null;
  notes: string | null;
  items: InvoiceItem[];
  request: {
    id: string;
    customer: {
      name: string;
      email: string;
    };
  } | null;
}

export default function CustomerInvoicePage() {
  const { id } = useParams() as { id: string };
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/public/invoice/${id}`);
      const data = await response.json();

      if (!response.ok || !data.invoice) {
        throw new Error(data.error || 'Invoice not found');
      }

      const invoiceData = data.invoice;
      setInvoice({
        id: invoiceData.id,
        invoice_number: invoiceData.invoice_number || null,
        subtotal: invoiceData.subtotal || 0,
        tax_amount: invoiceData.tax_amount || 0,
        shipping_amount: invoiceData.shipping_amount || 0,
        total: invoiceData.total || 0,
        status: invoiceData.status as Invoice['status'],
        created_at: invoiceData.created_at,
        paid_at: invoiceData.paid_at || null,
        due_date: invoiceData.due_date || null,
        notes: invoiceData.notes || null,
        items: invoiceData.items || [],
        request: invoiceData.request || null,
      });
    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError('Invoice not found or has been removed.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: CheckCircle,
          label: 'Paid',
          color: 'bg-green-500/10 text-green-600',
          message: 'Thank you for your payment!',
        };
      case 'cancelled':
        return {
          icon: XCircle,
          label: 'Cancelled',
          color: 'bg-red-500/10 text-red-600',
          message: 'This invoice has been cancelled.',
        };
      case 'refunded':
        return {
          icon: XCircle,
          label: 'Refunded',
          color: 'bg-orange-500/10 text-orange-600',
          message: 'This invoice has been refunded.',
        };
      case 'sent':
        return {
          icon: Clock,
          label: 'Awaiting Payment',
          color: 'bg-blue-500/10 text-blue-600',
          message: 'Payment is pending.',
        };
      default:
        return {
          icon: Clock,
          label: 'Draft',
          color: 'bg-gray-500/10 text-gray-600',
          message: 'This invoice is being prepared.',
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Invoice Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'The invoice you are looking for does not exist.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(invoice.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-muted/30 py-8 print:py-0 print:bg-white">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8 print:mb-4">
          <h1 className="text-3xl font-heading font-bold text-gold mb-2">
            Enchanted Park Pickups
          </h1>
          <p className="text-muted-foreground">
            Your personal shopper for Disney, Universal & SeaWorld merchandise
          </p>
        </div>

        {/* Status Banner */}
        <div className={`rounded-lg p-4 mb-6 print:hidden ${statusInfo.color}`}>
          <div className="flex items-center justify-center gap-2">
            <StatusIcon className="w-5 h-5" />
            <span className="font-medium">{statusInfo.message}</span>
          </div>
        </div>

        {/* Invoice Card */}
        <Card className="print:shadow-none print:border-0">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Invoice</CardTitle>
              {invoice.invoice_number && (
                <p className="text-muted-foreground font-mono">
                  {invoice.invoice_number}
                </p>
              )}
            </div>
            <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Invoice Details */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Bill To
                </h3>
                <p className="font-medium">{invoice.request?.customer?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {invoice.request?.customer?.email}
                </p>
              </div>
              <div className="md:text-right">
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="text-muted-foreground">Invoice Date: </span>
                    <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                  </div>
                  {invoice.due_date && (
                    <div>
                      <span className="text-muted-foreground">Due Date: </span>
                      <span>{new Date(invoice.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {invoice.paid_at && (
                    <div>
                      <span className="text-muted-foreground">Paid On: </span>
                      <span className="text-green-600 font-medium">
                        {new Date(invoice.paid_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h3 className="font-medium mb-3">Items</h3>
              <div className="space-y-3">
                {invoice.items?.map((item, index) => {
                  const itemTotal = (item.unit_price * item.quantity) +
                    (item.tax_amount || 0) +
                    (item.pickup_fee || 0) +
                    (item.shipping_fee || 0) +
                    (item.custom_fee_amount || 0);
                  return (
                    <div
                      key={index}
                      className="flex justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × ${(item.unit_price || 0).toFixed(2)}
                          {(item.pickup_fee || 0) > 0 && (
                            <span> + ${item.pickup_fee.toFixed(2)} service fee</span>
                          )}
                          {(item.tax_amount || 0) > 0 && (
                            <span> + ${item.tax_amount.toFixed(2)} tax</span>
                          )}
                          {(item.shipping_fee || 0) > 0 && (
                            <span> + ${item.shipping_fee.toFixed(2)} shipping</span>
                          )}
                          {(item.custom_fee_amount || 0) > 0 && item.custom_fee_label && (
                            <span> + ${item.custom_fee_amount.toFixed(2)} {item.custom_fee_label}</span>
                          )}
                        </p>
                      </div>
                      <p className="font-medium">
                        ${itemTotal.toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax (6.5%)</span>
                <span>${invoice.tax_amount.toFixed(2)}</span>
              </div>
              {invoice.shipping_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>${invoice.shipping_amount.toFixed(2)}</span>
                </div>
              )}
              {invoice.cc_fee_enabled && invoice.cc_fee_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    CC Processing Fee ({invoice.cc_fee_percentage || 3}%)
                  </span>
                  <span>${invoice.cc_fee_amount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total Due</span>
                <span className="text-green-600">${invoice.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">
                    Notes
                  </h3>
                  <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </>
            )}

            {/* Payment Section - Only show for unpaid invoices */}
            {(invoice.status === 'sent' || invoice.status === 'draft') && (
              <>
                <Separator />
                <div className="bg-muted/50 rounded-lg p-4 print:bg-gray-100">
                  <h3 className="font-medium mb-2">Payment</h3>
                  {invoice.paypal_invoice_id ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        A PayPal invoice has been sent to your email. You can also pay directly using the button below.
                      </p>
                      <a
                        href={`https://www.paypal.com/invoice/p/#${invoice.paypal_invoice_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md bg-[#0070ba] px-6 py-3 text-sm font-medium text-white hover:bg-[#005ea6] transition-colors"
                      >
                        Pay with PayPal
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      You will receive payment instructions via email. If you have any
                      questions, please contact us at{' '}
                      <a
                        href="mailto:hello@enchantedparkpickups.com"
                        className="text-gold hover:underline"
                      >
                        hello@enchantedparkpickups.com
                      </a>
                    </p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-center gap-4 mt-6 print:hidden">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print Invoice
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground print:mt-4">
          <p>Enchanted Park Pickups</p>
          <p>Orlando, Florida</p>
          <p>
            <a href="mailto:hello@enchantedparkpickups.com" className="hover:underline">
              hello@enchantedparkpickups.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
