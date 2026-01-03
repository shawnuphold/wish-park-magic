// @ts-nocheck
"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2, Plus, Trash2, ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  type ItemCategory,
  type Park,
  SPECIALTY_CATEGORIES,
} from '@/lib/database.types';
import { ImageUploader } from '@/components/ImageUploader';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface RequestItem {
  name: string;
  description: string;
  category: ItemCategory;
  park: Park;
  reference_url: string;
  reference_images: string[];
  quantity: number;
  estimated_price: string;
  is_specialty: boolean;
}

const categories: { value: ItemCategory; label: string }[] = [
  { value: 'loungefly', label: 'Loungefly' },
  { value: 'ears', label: 'Ears' },
  { value: 'spirit_jersey', label: 'Spirit Jersey' },
  { value: 'popcorn_bucket', label: 'Popcorn Bucket' },
  { value: 'pins', label: 'Pins' },
  { value: 'plush', label: 'Plush' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'drinkware', label: 'Drinkware' },
  { value: 'collectible', label: 'Collectible' },
  { value: 'other', label: 'Other' },
];

const parks: { value: Park; label: string }[] = [
  { value: 'disney', label: 'Disney' },
  { value: 'universal', label: 'Universal' },
  { value: 'seaworld', label: 'SeaWorld' },
];

const emptyItem: RequestItem = {
  name: '',
  description: '',
  category: 'other',
  park: 'disney',
  reference_url: '',
  reference_images: [],
  quantity: 1,
  estimated_price: '',
  is_specialty: false,
};

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer');
  const { toast } = useToast();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(preselectedCustomerId || '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<RequestItem[]>([{ ...emptyItem }]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, email')
          .order('name');

        if (error) throw error;
        setCustomers(data || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, []);

  const handleItemChange = (index: number, field: keyof RequestItem, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // Auto-set specialty based on category
      if (field === 'category') {
        updated[index].is_specialty = SPECIALTY_CATEGORIES.includes(value);
      }

      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, { ...emptyItem }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      toast({
        title: 'Error',
        description: 'Please select a customer',
        variant: 'destructive',
      });
      return;
    }

    if (items.some((item) => !item.name)) {
      toast({
        title: 'Error',
        description: 'All items must have a name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create the request
      const { data: request, error: requestError } = await supabase
        .from('requests')
        .insert({
          customer_id: selectedCustomerId,
          status: 'pending',
          notes: notes || null,
        })
        .select()
        .single();

      if (requestError) throw requestError;

      // Create request items
      const itemsToInsert = items.map((item) => ({
        request_id: request.id,
        name: item.name,
        description: item.description || null,
        category: item.category,
        park: item.park,
        reference_url: item.reference_url || null,
        reference_images: item.reference_images.length > 0 ? item.reference_images : [],
        quantity: item.quantity,
        estimated_price: item.estimated_price ? parseFloat(item.estimated_price) : null,
        is_specialty: item.is_specialty,
        status: 'pending' as const,
      }));

      const { error: itemsError } = await supabase
        .from('request_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Request created',
        description: `Request with ${items.length} item(s) has been created.`,
      });

      router.push(`/admin/requests/${request.id}`);
    } catch (error: any) {
      console.error('Error creating request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create request',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">New Request</h1>
          <p className="text-muted-foreground">Create a new shopping request</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Select Customer *</Label>
              <Select
                value={selectedCustomerId}
                onValueChange={setSelectedCustomerId}
                disabled={loadingCustomers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers.length === 0 && !loadingCustomers && (
                <p className="text-sm text-muted-foreground">
                  No customers found.{' '}
                  <Link href="/admin/customers/new" className="text-gold hover:underline">
                    Add one first
                  </Link>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Request Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions or notes..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {items.map((item, index) => (
              <div key={index} className="p-4 rounded-lg border bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Item {index + 1}
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Item Name *</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                      placeholder="e.g., Mickey Ears, Stitch Loungefly"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Color, size, specific details..."
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={item.category}
                      onValueChange={(v) => handleItemChange(index, 'category', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Park</Label>
                    <Select
                      value={item.park}
                      onValueChange={(v) => handleItemChange(index, 'park', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {parks.map((park) => (
                          <SelectItem key={park.value} value={park.value}>
                            {park.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Reference URL</Label>
                    <Input
                      type="url"
                      value={item.reference_url}
                      onChange={(e) => handleItemChange(index, 'reference_url', e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estimated Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.estimated_price}
                      onChange={(e) => handleItemChange(index, 'estimated_price', e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Reference Images */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Reference Images
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload photos or screenshots of the item. Paste with Ctrl+V or drag & drop.
                  </p>
                  <ImageUploader
                    images={item.reference_images}
                    onImagesChange={(images) => handleItemChange(index, 'reference_images', images)}
                    folder="reference-images"
                    maxImages={5}
                    showCamera={true}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`specialty-${index}`}
                    checked={item.is_specialty}
                    onCheckedChange={(checked) => handleItemChange(index, 'is_specialty', checked)}
                  />
                  <Label htmlFor={`specialty-${index}`} className="text-sm font-normal">
                    Specialty item (10% pickup fee instead of $6 flat)
                  </Label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/admin/requests">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" variant="gold" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Request'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewRequestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    }>
      <NewRequestForm />
    </Suspense>
  );
}
