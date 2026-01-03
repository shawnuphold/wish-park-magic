'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus, Trash2, Save, Search, User } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
}

interface Request {
  id: string;
  description: string;
  status: string;
  created_at: string;
  customer: Customer;
}

const TAX_RATE = 0.065; // Florida 6.5%

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Invoice data
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: '', quantity: 1, unit_price: 0 },
  ]);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [notes, setNotes] = useState('');

  // Customer selection dialog
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerRequests(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  async function loadCustomers() {
    const { data } = await supabase
      .from('customers')
      .select('id, name, email')
      .order('name');

    if (data) setCustomers(data);
  }

  async function loadCustomerRequests(customerId: string) {
    const { data } = await supabase
      .from('requests')
      .select('id, description, status, created_at, customer:customers(id, name, email)')
      .eq('customer_id', customerId)
      .in('status', ['found', 'invoiced', 'pending', 'scheduled', 'shopping'])
      .order('created_at', { ascending: false });

    if (data) {
      setRequests(data.map(r => ({
        ...r,
        customer: r.customer as Customer
      })));
    }
  }

  function addLineItem() {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), description: '', quantity: 1, unit_price: 0 },
    ]);
  }

  function removeLineItem(id: string) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((item) => item.id !== id));
    }
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems(
      lineItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  // Calculate totals
  const subtotal = lineItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const taxAmount = subtotal * TAX_RATE;
  const total = subtotal + taxAmount + shippingAmount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (lineItems.every((item) => !item.description || item.unit_price === 0)) {
      alert('Please add at least one line item');
      return;
    }

    setLoading(true);

    try {
      // Create the invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          request_id: selectedRequest?.id || null,
          subtotal,
          tax_amount: taxAmount,
          shipping_amount: shippingAmount,
          total,
          status: 'draft',
          notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // If we have a request, update its status
      if (selectedRequest) {
        await supabase
          .from('requests')
          .update({ status: 'invoiced' })
          .eq('id', selectedRequest.id);
      }

      // Redirect to the invoice detail page
      router.push(`/admin/invoices/${invoice.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/invoices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">New Invoice</h1>
          <p className="text-muted-foreground">Create a new invoice for a customer</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Customer Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Customer</CardTitle>
              <CardDescription>Select the customer for this invoice</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setSelectedRequest(null);
                      setRequests([]);
                    }}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-20"
                  onClick={() => setCustomerDialogOpen(true)}
                >
                  <User className="w-5 h-5 mr-2" />
                  Select Customer
                </Button>
              )}

              {selectedCustomer && requests.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Request (Optional)</Label>
                  <Select
                    value={selectedRequest?.id || ''}
                    onValueChange={(value) => {
                      const request = requests.find((r) => r.id === value);
                      setSelectedRequest(request || null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a request to link..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No linked request</SelectItem>
                      {requests.map((request) => (
                        <SelectItem key={request.id} value={request.id}>
                          {request.description?.slice(0, 50) || 'Request'} - {request.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Linking to a request will update its status to "invoiced"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Totals Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax (6.5%)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping</span>
                  <span>${shippingAmount.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Line Items</CardTitle>
                <CardDescription>Add items to the invoice</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                <div className="col-span-6">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-1 text-right">Total</div>
                <div className="col-span-1"></div>
              </div>

              {/* Items */}
              {lineItems.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-6">
                    <Input
                      placeholder="Item description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, 'quantity', parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={item.unit_price || ''}
                      onChange={(e) =>
                        updateLineItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-1 text-right font-medium">
                    ${(item.quantity * item.unit_price).toFixed(2)}
                  </div>
                  <div className="col-span-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLineItem(item.id)}
                      disabled={lineItems.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}

              {/* Shipping */}
              <div className="grid grid-cols-12 gap-4 items-center pt-4 border-t">
                <div className="col-span-6">
                  <span className="text-sm font-medium">Shipping</span>
                </div>
                <div className="col-span-2"></div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={shippingAmount || ''}
                    onChange={(e) => setShippingAmount(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-1 text-right font-medium">
                  ${shippingAmount.toFixed(2)}
                </div>
                <div className="col-span-1"></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Add any notes or special instructions</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Notes for the customer..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/admin/invoices">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || !selectedCustomer}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating...' : 'Create Invoice'}
          </Button>
        </div>
      </form>

      {/* Customer Selection Dialog */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>Choose a customer for this invoice</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors text-left"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setCustomerDialogOpen(false);
                    setCustomerSearch('');
                  }}
                >
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <span className="text-gold font-semibold">
                      {customer.name[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-sm text-muted-foreground">{customer.email}</p>
                  </div>
                </button>
              ))}

              {filteredCustomers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No customers found</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
