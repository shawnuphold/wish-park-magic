'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  MessageSquare,
  Loader2,
  Check,
  AlertCircle,
  X,
  Plus,
  Sparkles,
  User,
  Clipboard,
  ChevronDown,
  ChevronUp,
  Trash2,
  Search,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Step = 'upload' | 'analyzing' | 'review' | 'success';

interface ParsedItem {
  item_name: string;
  quantity: number;
  estimated_price: number | null;
  category: string | null;
  notes: string | null;
}

interface CustomerMatch {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  match_score: number;
  match_reason: string;
}

interface ParsedCustomer {
  customer_name: string;
  customer_identifier: string | null;
  customer_matches: CustomerMatch[];
  items: ParsedItem[];
  park_preference: string | null;
  location_hints: string[];
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  notes: string | null;
  // UI state
  expanded: boolean;
  selectedCustomerId: string | null;
  createNewCustomer: boolean;
  newCustomerEmail: string;
}

interface CreatedRequest {
  customer_name: string;
  request_id: string;
  item_count: number;
}

const CATEGORIES = [
  { value: 'loungefly', label: 'Loungefly' },
  { value: 'ears', label: 'Ears' },
  { value: 'spirit_jersey', label: 'Spirit Jersey' },
  { value: 'popcorn_bucket', label: 'Popcorn Bucket' },
  { value: 'pins', label: 'Pins' },
  { value: 'plush', label: 'Plush' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'drinkware', label: 'Drinkware' },
  { value: 'collectible', label: 'Collectible' },
  { value: 'home_decor', label: 'Home Decor' },
  { value: 'toys', label: 'Toys' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'other', label: 'Other' },
];

const URGENCY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'normal', label: 'Normal', color: 'bg-blue-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

export function MultiCustomerScreenshotParser() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [rawText, setRawText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parsed customers
  const [customers, setCustomers] = useState<ParsedCustomer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdRequests, setCreatedRequests] = useState<CreatedRequest[]>([]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB');
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Store mime type
    setImageMimeType(file.type || 'image/png');

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);

    setError(null);
  }, []);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (step !== 'upload') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            const dt = new DataTransfer();
            dt.items.add(file);
            handleFileSelect(dt.files);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [step, handleFileSelect]);

  // Analyze the screenshot for multiple customers
  const analyzeScreenshot = async () => {
    if (!imageBase64) return;

    setStep('analyzing');
    setError(null);

    try {
      const response = await fetch('/api/requests/parse-multi-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64, mimeType: imageMimeType }),
      });

      const result = await response.json();

      if (result.success && result.customers?.length > 0) {
        // Initialize UI state for each customer
        const customersWithState: ParsedCustomer[] = result.customers.map((c: any) => ({
          ...c,
          expanded: true,
          selectedCustomerId: c.customer_matches?.[0]?.id || null,
          createNewCustomer: !c.customer_matches?.length,
          newCustomerEmail: '',
        }));

        setCustomers(customersWithState);
        setRawText(result.raw_text);
        setStep('review');
      } else {
        setError(result.error || 'Could not parse any customer requests from this image');
        setStep('upload');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('upload');
    }
  };

  // Update customer field
  const updateCustomer = (index: number, field: keyof ParsedCustomer, value: any) => {
    setCustomers(prev => prev.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    ));
  };

  // Update item field within customer
  const updateItem = (customerIndex: number, itemIndex: number, field: keyof ParsedItem, value: any) => {
    setCustomers(prev => prev.map((c, ci) =>
      ci === customerIndex ? {
        ...c,
        items: c.items.map((item, ii) =>
          ii === itemIndex ? { ...item, [field]: value } : item
        )
      } : c
    ));
  };

  // Add item to customer
  const addItem = (customerIndex: number) => {
    setCustomers(prev => prev.map((c, i) =>
      i === customerIndex ? {
        ...c,
        items: [...c.items, {
          item_name: '',
          quantity: 1,
          estimated_price: null,
          category: 'other',
          notes: null,
        }]
      } : c
    ));
  };

  // Remove item from customer
  const removeItem = (customerIndex: number, itemIndex: number) => {
    setCustomers(prev => prev.map((c, ci) =>
      ci === customerIndex ? {
        ...c,
        items: c.items.filter((_, ii) => ii !== itemIndex)
      } : c
    ));
  };

  // Remove customer
  const removeCustomer = (index: number) => {
    setCustomers(prev => prev.filter((_, i) => i !== index));
  };

  // Submit all requests
  const submitRequests = async () => {
    // Validate
    const validCustomers = customers.filter(c => {
      if (!c.selectedCustomerId && !c.createNewCustomer) return false;
      if (c.createNewCustomer && !c.customer_name.trim()) return false;
      if (c.items.length === 0 || !c.items.some(i => i.item_name.trim())) return false;
      return true;
    });

    if (validCustomers.length === 0) {
      setError('No valid customer requests to submit');
      return;
    }

    setSubmitting(true);
    setError(null);
    const created: CreatedRequest[] = [];

    try {
      for (const customer of validCustomers) {
        let customerId = customer.selectedCustomerId;

        // Create new customer if needed
        if (customer.createNewCustomer) {
          // Use provided email or NULL (no placeholder needed)
          const customerEmail = customer.newCustomerEmail?.trim() || null;
          const { data: newCustomer, error: custError } = await supabase
            .from('customers')
            .insert({
              name: customer.customer_name,
              email: customerEmail,
            })
            .select('id')
            .single();

          if (custError) throw custError;
          customerId = newCustomer.id;
        }

        if (!customerId) continue;

        // Create request
        const { data: request, error: reqError } = await supabase
          .from('requests')
          .insert({
            customer_id: customerId,
            status: 'pending',
            notes: customer.notes || null,
          })
          .select('id')
          .single();

        if (reqError) throw reqError;

        // Create request items
        const validItems = customer.items.filter(i => i.item_name.trim());
        for (const item of validItems) {
          const { error: itemError } = await supabase
            .from('request_items')
            .insert({
              request_id: request.id,
              name: item.item_name,
              quantity: item.quantity || 1,
              category: item.category || 'other',
              estimated_price: item.estimated_price,
              notes: item.notes,
              status: 'pending',
            });

          if (itemError) throw itemError;
        }

        created.push({
          customer_name: customer.customer_name,
          request_id: request.id,
          item_count: validItems.length,
        });
      }

      setCreatedRequests(created);
      toast.success(`Created ${created.length} request${created.length > 1 ? 's' : ''} successfully!`);
      setStep('success');
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create requests');
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const reset = () => {
    setStep('upload');
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageBase64(null);
    setImageMimeType('image/png');
    setCustomers([]);
    setRawText(null);
    setCreatedRequests([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getUrgencyColor = (urgency: string) => {
    const option = URGENCY_OPTIONS.find(o => o.value === urgency);
    return option?.color || 'bg-blue-500';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {step === 'upload' && 'Parse Customer Messages'}
            {step === 'analyzing' && 'Analyzing Messages...'}
            {step === 'review' && `Review ${customers.length} Customer Request${customers.length > 1 ? 's' : ''}`}
            {step === 'success' && 'Requests Created!'}
          </CardTitle>
          <CardDescription>
            {step === 'upload' && 'Upload a screenshot of DMs or text messages from customers'}
            {step === 'analyzing' && 'AI is identifying customers and their requests...'}
            {step === 'review' && 'Review and match customers, then submit their requests'}
            {step === 'success' && `Successfully created ${createdRequests.length} request${createdRequests.length > 1 ? 's' : ''}`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{error}</span>
              <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-4">
              {/* Upload Area */}
              <div
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files);
                }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors"
              >
                {previewUrl ? (
                  <div className="space-y-4">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-64 mx-auto rounded-lg shadow-md"
                    />
                    <p className="text-sm text-muted-foreground">Click to change image</p>
                  </div>
                ) : (
                  <>
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-lg font-medium mb-2">
                      Drop screenshot here or click to upload
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clipboard className="h-4 w-4" />
                        Paste (Ctrl+V)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Upload screenshots of Instagram DMs, text messages, or any customer conversations.
                      AI will detect multiple customers and their requests.
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  onClick={analyzeScreenshot}
                  disabled={!imageBase64}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Parse Messages
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {step === 'analyzing' && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-lg font-medium mb-2">Analyzing Screenshot...</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Identifying customers...</p>
                <p>Extracting requests...</p>
                <p>Matching to database...</p>
              </div>
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Analyzing"
                  className="max-h-32 mx-auto mt-6 rounded-lg opacity-50"
                />
              )}
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Image Preview (collapsible) */}
              {previewUrl && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
                    Show original screenshot
                  </summary>
                  <div className="mt-2 p-2 bg-muted rounded-lg">
                    <img
                      src={previewUrl}
                      alt="Original"
                      className="max-h-48 mx-auto rounded"
                    />
                  </div>
                </details>
              )}

              {/* Raw text (collapsible) */}
              {rawText && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
                    Show extracted text
                  </summary>
                  <div className="mt-2 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
                    {rawText}
                  </div>
                </details>
              )}

              <Separator />

              {/* Customer Cards */}
              <div className="space-y-4">
                {customers.map((customer, customerIndex) => (
                  <Card key={customerIndex} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{customer.customer_name}</CardTitle>
                            {customer.customer_identifier && (
                              <p className="text-sm text-muted-foreground">
                                {customer.customer_identifier}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getUrgencyColor(customer.urgency)}>
                            {customer.urgency}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCustomer(customerIndex, 'expanded', !customer.expanded)}
                          >
                            {customer.expanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeCustomer(customerIndex)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {customer.expanded && (
                      <CardContent className="space-y-4">
                        {/* Customer Matching */}
                        <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                          <Label className="flex items-center gap-2">
                            <Search className="h-4 w-4" />
                            Match to Customer
                          </Label>

                          {customer.customer_matches.length > 0 ? (
                            <div className="space-y-2">
                              {customer.customer_matches.map((match) => (
                                <div
                                  key={match.id}
                                  onClick={() => {
                                    updateCustomer(customerIndex, 'selectedCustomerId', match.id);
                                    updateCustomer(customerIndex, 'createNewCustomer', false);
                                  }}
                                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                                    customer.selectedCustomerId === match.id
                                      ? 'border-primary bg-primary/5'
                                      : 'border-transparent bg-background hover:bg-muted'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <UserCheck className="h-4 w-4 text-primary" />
                                      <span className="font-medium">{match.name}</span>
                                    </div>
                                    <Badge variant="outline" className={
                                      match.match_score >= 90 ? 'bg-green-100 text-green-700' :
                                      match.match_score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-orange-100 text-orange-700'
                                    }>
                                      {match.match_score}% match
                                    </Badge>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {match.email && <span>{match.email}</span>}
                                    {match.phone && <span> · {match.phone}</span>}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {match.match_reason}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              No matching customers found in database
                            </p>
                          )}

                          {/* Create New Customer Option */}
                          <div
                            onClick={() => {
                              updateCustomer(customerIndex, 'createNewCustomer', true);
                              updateCustomer(customerIndex, 'selectedCustomerId', null);
                            }}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              customer.createNewCustomer
                                ? 'border-primary bg-primary/5'
                                : 'border-dashed border-muted-foreground/30 hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <UserPlus className="h-4 w-4" />
                              <span className="font-medium">Create New Customer</span>
                            </div>
                          </div>

                          {customer.createNewCustomer && (
                            <div className="grid gap-2 pl-6">
                              <div className="space-y-1">
                                <Label className="text-xs">Name</Label>
                                <Input
                                  value={customer.customer_name}
                                  onChange={(e) => updateCustomer(customerIndex, 'customer_name', e.target.value)}
                                  placeholder="Customer name"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Email (optional)</Label>
                                <Input
                                  type="email"
                                  value={customer.newCustomerEmail}
                                  onChange={(e) => updateCustomer(customerIndex, 'newCustomerEmail', e.target.value)}
                                  placeholder="customer@email.com"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Items */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Items Requested</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addItem(customerIndex)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Item
                            </Button>
                          </div>

                          {customer.items.map((item, itemIndex) => (
                            <div
                              key={itemIndex}
                              className="grid gap-2 p-3 bg-background border rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <Input
                                    value={item.item_name}
                                    onChange={(e) => updateItem(customerIndex, itemIndex, 'item_name', e.target.value)}
                                    placeholder="Item name..."
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => removeItem(customerIndex, itemIndex)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-xs">Qty</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItem(customerIndex, itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Price</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.estimated_price || ''}
                                    onChange={(e) => updateItem(customerIndex, itemIndex, 'estimated_price', e.target.value ? parseFloat(e.target.value) : null)}
                                    placeholder="$"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Category</Label>
                                  <Select
                                    value={item.category || 'other'}
                                    onValueChange={(v) => updateItem(customerIndex, itemIndex, 'category', v)}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CATEGORIES.map(cat => (
                                        <SelectItem key={cat.value} value={cat.value}>
                                          {cat.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {item.notes && (
                                <Input
                                  value={item.notes}
                                  onChange={(e) => updateItem(customerIndex, itemIndex, 'notes', e.target.value)}
                                  placeholder="Notes..."
                                  className="text-sm"
                                />
                              )}
                            </div>
                          ))}

                          {customer.items.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No items - add at least one item
                            </p>
                          )}
                        </div>

                        {/* Urgency & Notes */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Urgency</Label>
                            <Select
                              value={customer.urgency}
                              onValueChange={(v) => updateCustomer(customerIndex, 'urgency', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {URGENCY_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Notes</Label>
                            <Textarea
                              value={customer.notes || ''}
                              onChange={(e) => updateCustomer(customerIndex, 'notes', e.target.value)}
                              rows={2}
                              placeholder="Additional notes..."
                            />
                          </div>
                        </div>

                        {/* Location hints */}
                        {customer.location_hints.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {customer.location_hints.map((hint, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {hint}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>

              {customers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No customers found. Try a different screenshot.
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={reset}>
                  Start Over
                </Button>
                <Button
                  onClick={submitRequests}
                  disabled={submitting || customers.length === 0}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create {customers.length} Request{customers.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {createdRequests.length} Request{createdRequests.length > 1 ? 's' : ''} Created!
                </h3>
              </div>

              <div className="space-y-2">
                {createdRequests.map((req, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <span className="font-medium">{req.customer_name}</span>
                      <span className="text-muted-foreground ml-2">
                        ({req.item_count} item{req.item_count > 1 ? 's' : ''})
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/requests/${req.request_id}`)}
                    >
                      View
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={reset}>
                  Parse Another Screenshot
                </Button>
                <Button onClick={() => router.push('/admin/requests')}>
                  View All Requests
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
