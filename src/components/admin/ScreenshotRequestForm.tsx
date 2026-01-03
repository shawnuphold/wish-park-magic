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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Upload,
  Camera,
  Loader2,
  Check,
  AlertCircle,
  X,
  Plus,
  Sparkles,
  MapPin,
  Copy,
  Clipboard,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { AnalyzedItem, ProductLocation } from '@/app/api/ai/analyze-screenshot/route';

type Step = 'upload' | 'analyzing' | 'review' | 'success';

interface ScreenshotRequestFormProps {
  customerId?: string;
  customerName?: string;
  onSuccess?: (requestId: string) => void;
  onCancel?: () => void;
  mode: 'customer' | 'admin';
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

const PARK_MAP: Record<string, string> = {
  'Magic Kingdom': 'disney',
  'EPCOT': 'disney',
  'Hollywood Studios': 'disney',
  'Animal Kingdom': 'disney',
  'Disney Springs': 'disney',
  'Universal Studios Florida': 'universal',
  'Islands of Adventure': 'universal',
  'CityWalk': 'universal',
  'Epic Universe': 'universal',
  'SeaWorld Orlando': 'seaworld',
};

export function ScreenshotRequestForm({
  customerId,
  customerName,
  onSuccess,
  onCancel,
  mode,
}: ScreenshotRequestFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state (from AI analysis)
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState('other');
  const [description, setDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('medium');
  const [locations, setLocations] = useState<ProductLocation[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Set<number>>(new Set());
  const [tags, setTags] = useState<string[]>([]);
  const [isThemeParkMerch, setIsThemeParkMerch] = useState(true);

  // Customer selection for admin mode
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch customers with server-side search
  useEffect(() => {
    if (mode === 'admin' && !customerId) {
      const searchCustomers = async () => {
        setCustomerLoading(true);
        try {
          let query = supabase
            .from('customers')
            .select('id, name, email')
            .order('name');

          // If there's a search term, filter on server
          if (customerSearch.trim()) {
            query = query.or(`name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`);
          }

          const { data } = await query.limit(50);
          if (data) setCustomers(data);
        } finally {
          setCustomerLoading(false);
        }
      };

      // Debounce search
      const timer = setTimeout(searchCustomers, 300);
      return () => clearTimeout(timer);
    }
  }, [mode, customerId, customerSearch]);

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
            handleFileSelect(new DataTransfer().files);
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

  // Analyze the screenshot
  const analyzeScreenshot = async () => {
    if (!imageBase64) return;

    setStep('analyzing');
    setError(null);

    try {
      const response = await fetch('/api/ai/analyze-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        const data: AnalyzedItem = result.data;

        // Pre-fill form
        setItemName(data.item_name || '');
        setCategory(data.category || 'other');
        setDescription(data.description || '');
        setEstimatedPrice(data.estimated_price?.toString() || '');
        setConfidence(data.confidence || 'medium');
        setLocations(data.possible_locations || []);
        setTags(data.tags || []);
        setNotes(data.notes || '');
        setIsThemeParkMerch(data.is_theme_park_merchandise !== false);

        // Select all locations by default
        if (data.possible_locations?.length) {
          setSelectedLocations(new Set(data.possible_locations.map((_, i) => i)));
        }

        setStep('review');
      } else {
        setError(result.error || 'Failed to analyze screenshot');
        setStep('upload');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('upload');
    }
  };

  // Toggle location selection
  const toggleLocation = (index: number) => {
    setSelectedLocations(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Add custom location
  const addCustomLocation = () => {
    setLocations(prev => [
      ...prev,
      { park: '', land: null, store: null, confidence: 'possible' as const }
    ]);
    setSelectedLocations(prev => new Set([...prev, locations.length]));
  };

  // Submit request
  const submitRequest = async () => {
    const custId = customerId || selectedCustomerId;
    if (!custId) {
      setError('Please select a customer');
      return;
    }

    if (!itemName.trim()) {
      setError('Item name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Determine park from selected locations
      const selectedLocs = locations.filter((_, i) => selectedLocations.has(i));
      let park = 'disney'; // default
      if (selectedLocs.length > 0) {
        const firstPark = selectedLocs[0].park;
        park = PARK_MAP[firstPark] || 'disney';
      }

      // Create the request
      const { data: request, error: reqError } = await supabase
        .from('requests')
        .insert({
          customer_id: custId,
          status: 'pending',
          notes: notes || null,
        })
        .select('id')
        .single();

      if (reqError) throw reqError;

      // Create the request item with locations
      const locationsJson = selectedLocs.map(loc => ({
        park: loc.park,
        land: loc.land,
        store: loc.store,
        confidence: loc.confidence,
      }));

      const { error: itemError } = await supabase
        .from('request_items')
        .insert({
          request_id: request.id,
          name: itemName,
          description: description || null,
          category: category,
          park: park,
          store_name: selectedLocs[0]?.store || null,
          land_name: selectedLocs[0]?.land || null,
          reference_image_url: previewUrl || null,
          quantity: quantity,
          estimated_price: estimatedPrice ? parseFloat(estimatedPrice) : null,
          is_specialty: category === 'collectible' || tags.includes('limited edition'),
          status: 'pending',
          notes: tags.length > 0 ? `Tags: ${tags.join(', ')}` : null,
        });

      if (itemError) throw itemError;

      toast.success('Request created successfully!');
      setStep('success');

      if (onSuccess) {
        onSuccess(request.id);
      } else {
        // Navigate to request detail
        setTimeout(() => {
          router.push(`/admin/requests/${request.id}`);
        }, 1500);
      }
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create request');
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
    setItemName('');
    setCategory('other');
    setDescription('');
    setEstimatedPrice('');
    setQuantity(1);
    setNotes('');
    setConfidence('medium');
    setLocations([]);
    setSelectedLocations(new Set());
    setTags([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-red-500';
      case 'confirmed': return 'bg-green-500';
      case 'likely': return 'bg-yellow-500';
      case 'possible': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Customers are now fetched with server-side search

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {step === 'upload' && 'Upload Merchandise Screenshot'}
          {step === 'analyzing' && 'Analyzing Screenshot...'}
          {step === 'review' && 'Review & Submit Request'}
          {step === 'success' && 'Request Created!'}
        </CardTitle>
        <CardDescription>
          {step === 'upload' && 'Upload a photo of the merchandise you want us to find'}
          {step === 'analyzing' && 'AI is identifying the item and finding locations...'}
          {step === 'review' && 'Review the details and make any edits before submitting'}
          {step === 'success' && 'Your request has been submitted successfully'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
            <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <div className="space-y-4">
            {/* Customer Selection (Admin mode without pre-selected customer) */}
            {mode === 'admin' && !customerId && (
              <div className="space-y-2">
                <Label>Customer *</Label>
                <Input
                  placeholder="Type to search customers..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                <ScrollArea className="h-48 border rounded-md p-2">
                  {customerLoading ? (
                    <div className="flex items-center justify-center h-20">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      {customerSearch ? 'No customers found' : 'Start typing to search...'}
                    </div>
                  ) : (
                    customers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`p-2 rounded cursor-pointer ${
                          selectedCustomerId === c.id
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs opacity-70">{c.email || 'No email'}</div>
                      </div>
                    ))
                  )}
                </ScrollArea>
                {customers.length >= 50 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 50 results. Type more to narrow search.
                  </p>
                )}
              </div>
            )}

            {/* Show selected customer name */}
            {(customerId && customerName) && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <span className="text-sm text-muted-foreground">Customer:</span>
                <span className="font-medium">{customerName}</span>
              </div>
            )}

            {/* Show selected customer from list */}
            {!customerId && selectedCustomerId && (
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Selected: </span>
                  <span className="font-medium">
                    {customers.find(c => c.id === selectedCustomerId)?.name || 'Loading...'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCustomerId('')}
                  className="h-6 px-2"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}

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
                    Drop image here or click to upload
                  </p>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clipboard className="h-4 w-4" />
                      Paste (Ctrl+V)
                    </span>
                    <span className="flex items-center gap-1">
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    JPEG, PNG, GIF, WebP. Max 10MB.
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                capture="environment"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                onClick={analyzeScreenshot}
                disabled={!imageBase64 || (mode === 'admin' && !customerId && !selectedCustomerId)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze with AI
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
              <p>Identifying merchandise...</p>
              <p>Searching for locations...</p>
              <p>Estimating price...</p>
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

        {/* Step 3: Review & Edit */}
        {step === 'review' && (
          <div className="space-y-6">
            {/* Confidence Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-medium">AI Analysis Complete</span>
              </div>
              <Badge className={getConfidenceColor(confidence)}>
                {confidence.toUpperCase()} Confidence
              </Badge>
            </div>

            {/* Image Preview */}
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Item"
                  className="max-h-40 rounded-lg shadow-md"
                />
              </div>
            )}

            {/* Not Theme Park Warning */}
            {!isThemeParkMerch && (
              <div className="p-3 bg-yellow-500/10 text-yellow-700 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                This may not be theme park merchandise. Please verify before submitting.
              </div>
            )}

            {/* Editable Form */}
            <div className="grid gap-4">
              {/* Item Name */}
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="Enter item name..."
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
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

              {/* Description */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Item description..."
                />
              </div>

              {/* Price & Quantity Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={estimatedPrice}
                      onChange={(e) => setEstimatedPrice(e.target.value)}
                      className="pl-7"
                      placeholder="0.00"
                      inputMode="decimal"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Locations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Locations Found
                  </Label>
                  <Button variant="outline" size="sm" onClick={addCustomLocation}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Location
                  </Button>
                </div>

                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No specific locations identified. You can add locations manually.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {locations.map((loc, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          selectedLocations.has(idx)
                            ? 'border-primary bg-primary/5'
                            : 'border-muted'
                        }`}
                      >
                        <Checkbox
                          checked={selectedLocations.has(idx)}
                          onCheckedChange={() => toggleLocation(idx)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">
                            {loc.park}
                            {loc.land && ` > ${loc.land}`}
                            {loc.store && ` > ${loc.store}`}
                          </div>
                        </div>
                        <Badge variant="outline" className={getConfidenceColor(loc.confidence)}>
                          {loc.confidence}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes for Shopper</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional instructions..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={reset}>
                Start Over
              </Button>
              <Button onClick={submitRequest} disabled={submitting || !itemName.trim()}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Submit Request
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Request Created!</h3>
            <p className="text-muted-foreground mb-6">
              Your request for &quot;{itemName}&quot; has been submitted.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={reset}>
                Add Another Item
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
