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
import { Separator } from '@/components/ui/separator';
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
import { ArrowLeft, Plus, Trash2, Save, Search, User, Pencil, ChevronDown, Loader2 } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface InvoiceItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  pickup_fee: number;
  shipping_fee: number;
  custom_fee_label: string;
  custom_fee_amount: number;
}

interface Request {
  id: string;
  description: string;
  status: string;
  created_at: string;
  customer: Customer;
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
};

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');

  // Invoice data
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');

  // CC Processing Fee
  const [ccFeeEnabled, setCcFeeEnabled] = useState(false);
  const [ccFeePercentage, setCcFeePercentage] = useState(3.0);
  const [ccFeeManualAmount, setCcFeeManualAmount] = useState<number | null>(null);

  // Dialogs
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<Omit<InvoiceItem, 'id'>>(defaultItem);

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerRequests(selectedCustomer.id);
    }
  }, [selectedCustomer]);

  // Load request items when a request is selected
  useEffect(() => {
    if (selectedRequest) {
      loadRequestItems(selectedRequest.id);
    }
  }, [selectedRequest]);

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

  async function loadRequestItems(requestId: string) {
    const { data } = await supabase
      .from('request_items')
      .select('*')
      .eq('request_id', requestId);

    if (data && data.length > 0) {
      const invoiceItems: InvoiceItem[] = data.map(item => ({
        id: `temp-${item.id}`,
        name: item.name,
        description: '',
        quantity: item.quantity || 1,
        unit_price: item.actual_price || item.estimated_price || 0,
        tax_amount: 0,
        pickup_fee: item.pickup_fee || 0,
        shipping_fee: 0,
        custom_fee_label: '',
        custom_fee_amount: 0,
      }));
      setItems(invoiceItems);
    }
  }

  // Calculate item total
  const calculateItemTotal = (item: InvoiceItem) => {
    return (item.unit_price * item.quantity) +
      item.tax_amount +
      item.pickup_fee +
      item.shipping_fee +
      (item.custom_fee_amount || 0);
  };

  // Calculate totals - breakdown by fee type
  const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const totalTax = items.reduce((sum, item) => sum + (item.tax_amount || 0), 0);
  const totalPickup = items.reduce((sum, item) => sum + (item.pickup_fee || 0), 0);
  const totalShipping = items.reduce((sum, item) => sum + (item.shipping_fee || 0), 0);
  const totalCustom = items.reduce((sum, item) => sum + (item.custom_fee_amount || 0), 0);

  // Subtotal before CC fee (used for percentage calculation)
  const subtotalBeforeCC = subtotal + totalTax + totalPickup + totalShipping + totalCustom;

  // CC Processing Fee calculation
  const calculatedCcFee = subtotalBeforeCC * (ccFeePercentage / 100);
  const actualCcFee = ccFeeEnabled
    ? (ccFeeManualAmount !== null ? ccFeeManualAmount : calculatedCcFee)
    : 0;

  const total = subtotalBeforeCC + actualCcFee;

  // Add new item
  function addItem() {
    if (!newItem.name) return;
    const item: InvoiceItem = {
      ...newItem,
      id: `temp-${Date.now()}`,
    };
    setItems([...items, item]);
    setNewItem(defaultItem);
    setShowAddDialog(false);
  }

  // Update item
  function updateItem() {
    if (!editingItem) return;
    setItems(items.map(i => i.id === editingItem.id ? editingItem : i));
    setEditingItem(null);
    setShowEditDialog(false);
  }

  // Delete item
  function deleteItem() {
    if (!deletingItemId) return;
    setItems(items.filter(i => i.id !== deletingItemId));
    setDeletingItemId(null);
    setShowDeleteDialog(false);
  }

  // Add fee to item
  function addFeeToItem(itemId: string, feeType: 'tax' | 'pickup' | 'shipping' | 'custom') {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (feeType === 'custom') {
      const label = prompt('Enter custom fee label:');
      if (!label) return;
      const amount = parseFloat(prompt('Enter amount:') || '0');
      if (isNaN(amount)) return;

      setItems(items.map(i =>
        i.id === itemId ? { ...i, custom_fee_label: label, custom_fee_amount: amount } : i
      ));
    } else {
      setEditingItem(item);
      setShowEditDialog(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCustomer) {
      alert('Please select a customer');
      return;
    }

    if (items.length === 0) {
      alert('Please add at least one item');
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
          tax_amount: totalTax + totalPickup + totalCustom,
          shipping_amount: totalShipping,
          cc_fee_enabled: ccFeeEnabled,
          cc_fee_percentage: ccFeePercentage,
          cc_fee_manual_amount: ccFeeManualAmount,
          cc_fee_amount: actualCcFee,
          total,
          status: 'draft',
          notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Save invoice items
      const itemsToInsert = items.map(item => ({
        invoice_id: invoice.id,
        name: item.name,
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_amount: item.tax_amount,
        pickup_fee: item.pickup_fee,
        shipping_fee: item.shipping_fee,
        custom_fee_label: item.custom_fee_label || null,
        custom_fee_amount: item.custom_fee_amount || 0,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error saving invoice items:', itemsError);
      }

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
                      setItems([]);
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

              {selectedCustomer && (
                <div className="space-y-2">
                  <Label>Link to Request (Required)</Label>
                  {requests.length > 0 ? (
                    <>
                      <Select
                        value={selectedRequest?.id || ''}
                        onValueChange={(value) => {
                          const request = requests.find((r) => r.id === value);
                          setSelectedRequest(request || null);
                          if (!request) setItems([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a request..." />
                        </SelectTrigger>
                        <SelectContent>
                          {requests.map((request) => (
                            <SelectItem key={request.id} value={request.id}>
                              {request.description?.slice(0, 50) || 'Request'} - {request.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select a request to create an invoice. Items will be imported automatically.
                      </p>
                    </>
                  ) : (
                    <div className="p-4 bg-muted rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        No open requests found for this customer.
                      </p>
                      <Link href="/admin/requests/new">
                        <Button type="button" variant="link" size="sm" className="mt-2">
                          Create a new request first
                        </Button>
                      </Link>
                    </div>
                  )}
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
                  <span>Items Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {totalTax > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax</span>
                    <span>${totalTax.toFixed(2)}</span>
                  </div>
                )}
                {totalPickup > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Pickup Fees</span>
                    <span>${totalPickup.toFixed(2)}</span>
                  </div>
                )}
                {totalShipping > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping</span>
                    <span>${totalShipping.toFixed(2)}</span>
                  </div>
                )}
                {totalCustom > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Custom Fees</span>
                    <span>${totalCustom.toFixed(2)}</span>
                  </div>
                )}

                {/* CC Processing Fee */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ccFeeEnabled"
                      checked={ccFeeEnabled}
                      onChange={(e) => setCcFeeEnabled(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="ccFeeEnabled" className="text-sm font-medium cursor-pointer">
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

        {/* Invoice Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Invoice Items</CardTitle>
                <CardDescription>Add items with per-line fees</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Table Header */}
              <div className="hidden md:grid md:grid-cols-12 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b">
                <div className="col-span-3">Item</div>
                <div className="col-span-1 text-center">Qty</div>
                <div className="col-span-1 text-right">Price</div>
                <div className="col-span-1 text-right">Tax</div>
                <div className="col-span-1 text-right">Pickup</div>
                <div className="col-span-1 text-right">Ship</div>
                <div className="col-span-1 text-right">Custom</div>
                <div className="col-span-1 text-right">Subtotal</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {items.map((item) => (
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="sm">
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
                      type="button"
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
                      type="button"
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
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No items yet.{' '}
                  <button
                    type="button"
                    onClick={() => setShowAddDialog(true)}
                    className="text-gold hover:underline"
                  >
                    Add an item
                  </button>
                </div>
              )}

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
          <Button type="submit" disabled={loading || !selectedCustomer || !selectedRequest || items.length === 0}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
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

      {/* Add Item Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>Add a new item to the invoice</DialogDescription>
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
                value={newItem.description}
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
                <Label>Tax ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={newItem.tax_amount || ''}
                  onChange={(e) => setNewItem({ ...newItem, tax_amount: parseFloat(e.target.value) || 0 })}
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
                value={newItem.custom_fee_label}
                onChange={(e) => setNewItem({ ...newItem, custom_fee_label: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => {
              setShowAddDialog(false);
              setNewItem(defaultItem);
            }}>
              Cancel
            </Button>
            <Button type="button" onClick={addItem} disabled={!newItem.name}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details and fees</DialogDescription>
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
                  value={editingItem.description}
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
                  <Label>Tax ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingItem.tax_amount}
                    onChange={(e) => setEditingItem({ ...editingItem, tax_amount: parseFloat(e.target.value) || 0 })}
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
                  value={editingItem.custom_fee_label}
                  onChange={(e) => setEditingItem({ ...editingItem, custom_fee_label: e.target.value })}
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
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={updateItem}>
              Save Changes
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
