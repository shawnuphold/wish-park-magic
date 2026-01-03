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
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Camera,
  MapPin,
  Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Step = 'upload' | 'analyzing' | 'review' | 'success';
type ParseMode = 'auto' | 'messages' | 'merchandise';

// Merchandise types
interface ProductLocation {
  park: string;
  land: string | null;
  store: string | null;
  confidence: 'confirmed' | 'likely' | 'possible';
}

interface MerchandiseItem {
  item_name: string;
  category: string;
  description: string;
  estimated_price: number | null;
  confidence: 'high' | 'medium' | 'low';
  possible_locations: ProductLocation[];
  tags: string[];
  notes: string | null;
}

// Customer message types
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

interface SmartScreenshotParserProps {
  customerId?: string;
  customerName?: string;
}

export function SmartScreenshotParser({ customerId, customerName }: SmartScreenshotParserProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('upload');
  const [parseMode, setParseMode] = useState<ParseMode>('auto');
  const [detectedMode, setDetectedMode] = useState<'messages' | 'merchandise' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/png');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merchandise state
  const [merchandiseItem, setMerchandiseItem] = useState<MerchandiseItem | null>(null);
  const [merchandiseQuantity, setMerchandiseQuantity] = useState(1);
  const [merchandiseNotes, setMerchandiseNotes] = useState('');
  const [selectedLocations, setSelectedLocations] = useState<Set<number>>(new Set());

  // Customer selection for merchandise mode
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState(customerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerLoading, setCustomerLoading] = useState(false);

  // Multi-customer state
  const [parsedCustomers, setParsedCustomers] = useState<ParsedCustomer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdRequests, setCreatedRequests] = useState<CreatedRequest[]>([]);

  // Fetch customers for merchandise mode
  useEffect(() => {
    if (!customerId) {
      const searchCustomers = async () => {
        setCustomerLoading(true);
        try {
          let query = supabase
            .from('customers')
            .select('id, name, email')
            .order('name');

          if (customerSearch.trim()) {
            query = query.or(`name.ilike.%${customerSearch}%,email.ilike.%${customerSearch}%`);
          }

          const { data } = await query.limit(50);
          if (data) setCustomers(data);
        } finally {
          setCustomerLoading(false);
        }
      };

      const timer = setTimeout(searchCustomers, 300);
      return () => clearTimeout(timer);
    }
  }, [customerId, customerSearch]);

  // Upload image to S3
  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Get presigned URL
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          folder: 'reference-images',
        }),
      });

      if (!response.ok) throw new Error('Failed to get upload URL');

      const { uploadUrl, fileUrl } = await response.json();

      // Upload to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload image');

      return fileUrl;
    } catch (err) {
      console.error('Image upload error:', err);
      return null;
    }
  };

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

    // Store file for later upload
    setImageFile(file);

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

  // Analyze the screenshot
  const analyzeScreenshot = async () => {
    if (!imageBase64 || !imageFile) return;

    setStep('analyzing');
    setError(null);

    try {
      // Upload image to S3 first
      const imageUrl = await uploadImage(imageFile);
      setUploadedImageUrl(imageUrl);

      // Determine which API to call based on mode
      const mode = parseMode === 'auto' ? 'auto' : parseMode;

      if (mode === 'merchandise') {
        // Call merchandise analysis API
        const response = await fetch('/api/ai/analyze-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64 }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setMerchandiseItem(result.data);
          setMerchandiseNotes(result.data.notes || '');
          if (result.data.possible_locations?.length) {
            setSelectedLocations(new Set(result.data.possible_locations.map((_: any, i: number) => i)));
          }
          setDetectedMode('merchandise');
          setStep('review');
        } else {
          setError(result.error || 'Failed to analyze screenshot');
          setStep('upload');
        }
      } else {
        // Call multi-customer message parsing API
        const response = await fetch('/api/requests/parse-multi-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64, mimeType: imageMimeType }),
        });

        const result = await response.json();

        if (result.success && result.customers?.length > 0) {
          const customersWithState: ParsedCustomer[] = result.customers.map((c: any) => ({
            ...c,
            expanded: true,
            selectedCustomerId: c.customer_matches?.[0]?.id || null,
            createNewCustomer: !c.customer_matches?.length,
            newCustomerEmail: '',
          }));

          setParsedCustomers(customersWithState);
          setRawText(result.raw_text);
          setDetectedMode('messages');
          setStep('review');
        } else if (mode === 'auto') {
          // Auto mode: Try merchandise analysis if message parsing failed
          const merchResponse = await fetch('/api/ai/analyze-screenshot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageBase64 }),
          });

          const merchResult = await merchResponse.json();

          if (merchResult.success && merchResult.data) {
            setMerchandiseItem(merchResult.data);
            setMerchandiseNotes(merchResult.data.notes || '');
            if (merchResult.data.possible_locations?.length) {
              setSelectedLocations(new Set(merchResult.data.possible_locations.map((_: any, i: number) => i)));
            }
            setDetectedMode('merchandise');
            setStep('review');
          } else {
            setError('Could not parse this screenshot. Please try a clearer image.');
            setStep('upload');
          }
        } else {
          setError(result.error || 'Could not find any customer messages in this image');
          setStep('upload');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setStep('upload');
    }
  };

  // Switch analysis mode
  const switchMode = async (newMode: 'messages' | 'merchandise') => {
    if (!imageBase64) return;

    setDetectedMode(null);
    setStep('analyzing');

    try {
      if (newMode === 'merchandise') {
        const response = await fetch('/api/ai/analyze-screenshot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64 }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setMerchandiseItem(result.data);
          setMerchandiseNotes(result.data.notes || '');
          if (result.data.possible_locations?.length) {
            setSelectedLocations(new Set(result.data.possible_locations.map((_: any, i: number) => i)));
          }
          setParsedCustomers([]);
          setDetectedMode('merchandise');
          setStep('review');
        } else {
          setError(result.error || 'Failed to analyze as merchandise');
          setDetectedMode('messages');
          setStep('review');
        }
      } else {
        const response = await fetch('/api/requests/parse-multi-customer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageBase64, mimeType: imageMimeType }),
        });

        const result = await response.json();

        if (result.success && result.customers?.length > 0) {
          const customersWithState: ParsedCustomer[] = result.customers.map((c: any) => ({
            ...c,
            expanded: true,
            selectedCustomerId: c.customer_matches?.[0]?.id || null,
            createNewCustomer: !c.customer_matches?.length,
            newCustomerEmail: '',
          }));

          setParsedCustomers(customersWithState);
          setMerchandiseItem(null);
          setRawText(result.raw_text);
          setDetectedMode('messages');
          setStep('review');
        } else {
          setError(result.error || 'Could not parse as customer messages');
          setDetectedMode('merchandise');
          setStep('review');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Switch failed');
      setStep('review');
    }
  };

  // Update customer field
  const updateCustomer = (index: number, field: keyof ParsedCustomer, value: any) => {
    setParsedCustomers(prev => prev.map((c, i) =>
      i === index ? { ...c, [field]: value } : c
    ));
  };

  // Update item field within customer
  const updateItem = (customerIndex: number, itemIndex: number, field: keyof ParsedItem, value: any) => {
    setParsedCustomers(prev => prev.map((c, ci) =>
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
    setParsedCustomers(prev => prev.map((c, i) =>
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
    setParsedCustomers(prev => prev.map((c, ci) =>
      ci === customerIndex ? {
        ...c,
        items: c.items.filter((_, ii) => ii !== itemIndex)
      } : c
    ));
  };

  // Remove customer
  const removeCustomer = (index: number) => {
    setParsedCustomers(prev => prev.filter((_, i) => i !== index));
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

  // Submit merchandise request
  const submitMerchandiseRequest = async () => {
    const custId = customerId || selectedCustomerId;
    if (!custId) {
      setError('Please select a customer');
      return;
    }

    if (!merchandiseItem?.item_name) {
      setError('Item name is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Determine park from selected locations
      const selectedLocs = merchandiseItem.possible_locations?.filter((_, i) => selectedLocations.has(i)) || [];
      let park = 'disney';
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
          notes: merchandiseNotes || null,
        })
        .select('id')
        .single();

      if (reqError) throw reqError;

      // Create the request item with image URL
      const { error: itemError } = await supabase
        .from('request_items')
        .insert({
          request_id: request.id,
          name: merchandiseItem.item_name,
          description: merchandiseItem.description || null,
          category: merchandiseItem.category || 'other',
          park: park,
          store_name: selectedLocs[0]?.store || null,
          land_name: selectedLocs[0]?.land || null,
          reference_image_url: uploadedImageUrl || null,
          quantity: merchandiseQuantity,
          estimated_price: merchandiseItem.estimated_price,
          is_specialty: merchandiseItem.category === 'collectible' || merchandiseItem.tags?.includes('limited edition'),
          status: 'pending',
          notes: merchandiseItem.tags?.length ? `Tags: ${merchandiseItem.tags.join(', ')}` : null,
        });

      if (itemError) throw itemError;

      const custName = customers.find(c => c.id === custId)?.name || customerName || 'Customer';
      setCreatedRequests([{
        customer_name: custName,
        request_id: request.id,
        item_count: 1,
      }]);

      toast.success('Request created successfully!');
      setStep('success');
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit multi-customer requests
  const submitCustomerRequests = async () => {
    const validCustomers = parsedCustomers.filter(c => {
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
          const { data: newCustomer, error: custError } = await supabase
            .from('customers')
            .insert({
              name: customer.customer_name,
              email: customer.newCustomerEmail || `${customer.customer_name.toLowerCase().replace(/\s+/g, '.')}@pending.local`,
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

        // Create request items with image URL
        const validItems = customer.items.filter(i => i.item_name.trim());

        // Determine park from customer's park_preference
        let park = 'disney';
        if (customer.park_preference) {
          if (customer.park_preference.startsWith('disney')) park = 'disney';
          else if (customer.park_preference.startsWith('universal')) park = 'universal';
          else if (customer.park_preference === 'seaworld') park = 'seaworld';
        }

        // Valid categories for the database
        const validCategories = [
          'loungefly', 'ears', 'spirit_jersey', 'popcorn_bucket', 'pins',
          'plush', 'apparel', 'drinkware', 'collectible', 'home_decor',
          'toys', 'jewelry', 'other'
        ];

        for (const item of validItems) {
          // Ensure category is valid, default to 'other' if not
          let category: string = 'other';
          if (item.category && validCategories.includes(item.category)) {
            category = item.category;
          }

          const { error: itemError } = await supabase
            .from('request_items')
            .insert({
              request_id: request.id,
              name: item.item_name,
              description: item.notes || null,
              quantity: item.quantity || 1,
              category: category,
              park: park,
              store_name: null,
              land_name: null,
              reference_url: null,
              reference_images: uploadedImageUrl ? [uploadedImageUrl] : [],
              estimated_price: item.estimated_price,
              is_specialty: category === 'loungefly' || category === 'popcorn_bucket',
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
    setParseMode('auto');
    setDetectedMode(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageBase64(null);
    setImageMimeType('image/png');
    setImageFile(null);
    setUploadedImageUrl(null);
    setMerchandiseItem(null);
    setMerchandiseQuantity(1);
    setMerchandiseNotes('');
    setSelectedLocations(new Set());
    setParsedCustomers([]);
    setRawText(null);
    setCreatedRequests([]);
    if (!customerId) setSelectedCustomerId('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getUrgencyColor = (urgency: string) => {
    const option = URGENCY_OPTIONS.find(o => o.value === urgency);
    return option?.color || 'bg-blue-500';
  };

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': case 'confirmed': return 'bg-green-500';
      case 'medium': case 'likely': return 'bg-yellow-500';
      case 'low': case 'possible': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {step === 'upload' && 'Smart Screenshot Parser'}
            {step === 'analyzing' && 'Analyzing Screenshot...'}
            {step === 'review' && (
              detectedMode === 'messages'
                ? `Review ${parsedCustomers.length} Customer Request${parsedCustomers.length > 1 ? 's' : ''}`
                : 'Review Merchandise Request'
            )}
            {step === 'success' && 'Requests Created!'}
          </CardTitle>
          <CardDescription>
            {step === 'upload' && 'Upload a screenshot - AI will detect if it\'s customer messages or merchandise'}
            {step === 'analyzing' && 'AI is analyzing your screenshot...'}
            {step === 'review' && 'Review the details and submit'}
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
              {/* Mode Selection */}
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Label className="text-sm">Parse as:</Label>
                <div className="flex gap-2">
                  <Button
                    variant={parseMode === 'auto' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParseMode('auto')}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Auto-detect
                  </Button>
                  <Button
                    variant={parseMode === 'messages' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParseMode('messages')}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Messages
                  </Button>
                  <Button
                    variant={parseMode === 'merchandise' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setParseMode('merchandise')}
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Merchandise
                  </Button>
                </div>
              </div>

              {/* Customer Selection (for merchandise mode or pre-selected) */}
              {(parseMode === 'merchandise' || customerId) && !customerId && (
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Input
                    placeholder="Type to search customers..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                  />
                  <ScrollArea className="h-36 border rounded-md p-2">
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
                </div>
              )}

              {/* Show selected customer */}
              {(customerId && customerName) && (
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Customer:</span>
                  <span className="font-medium">{customerName}</span>
                </div>
              )}

              {!customerId && selectedCustomerId && (
                <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div>
                    <span className="text-sm text-muted-foreground">Selected: </span>
                    <span className="font-medium">
                      {customers.find(c => c.id === selectedCustomerId)?.name}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedCustomerId('')} className="h-6 px-2">
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
                      Drop screenshot here or click to upload
                    </p>
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clipboard className="h-4 w-4" />
                        Paste (Ctrl+V)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Works with DM screenshots, text messages, or merchandise photos
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
                  disabled={!imageBase64 || (parseMode === 'merchandise' && !customerId && !selectedCustomerId)}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Screenshot
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
                <p>Detecting content type...</p>
                <p>Extracting information...</p>
                <p>Matching customers...</p>
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
              {/* Mode Switch */}
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  {detectedMode === 'messages' ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">
                    Detected as: {detectedMode === 'messages' ? 'Customer Messages' : 'Merchandise Photo'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => switchMode(detectedMode === 'messages' ? 'merchandise' : 'messages')}
                >
                  Switch to {detectedMode === 'messages' ? 'Merchandise' : 'Messages'}
                </Button>
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <details className="group">
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                    <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
                    Show screenshot {uploadedImageUrl && '(saved)'}
                  </summary>
                  <div className="mt-2 p-2 bg-muted rounded-lg">
                    <img src={previewUrl} alt="Original" className="max-h-48 mx-auto rounded" />
                    {uploadedImageUrl && (
                      <p className="text-xs text-center text-green-600 mt-2">
                        <Check className="h-3 w-3 inline mr-1" />
                        Image saved
                      </p>
                    )}
                  </div>
                </details>
              )}

              <Separator />

              {/* Merchandise Review */}
              {detectedMode === 'merchandise' && merchandiseItem && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge className={getConfidenceColor(merchandiseItem.confidence)}>
                      {merchandiseItem.confidence.toUpperCase()} Confidence
                    </Badge>
                  </div>

                  {/* Customer selection if not pre-selected */}
                  {!customerId && !selectedCustomerId && (
                    <div className="space-y-2 p-3 border border-yellow-500/30 bg-yellow-500/10 rounded-lg">
                      <Label>Select Customer *</Label>
                      <Input
                        placeholder="Search customers..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                      <ScrollArea className="h-32 border rounded-md p-2 bg-background">
                        {customers.map(c => (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCustomerId(c.id)}
                            className={`p-2 rounded cursor-pointer ${
                              selectedCustomerId === c.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                            }`}
                          >
                            <div className="font-medium">{c.name}</div>
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  )}

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>Item Name *</Label>
                      <Input
                        value={merchandiseItem.item_name}
                        onChange={(e) => setMerchandiseItem({ ...merchandiseItem, item_name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={merchandiseItem.category}
                          onValueChange={(v) => setMerchandiseItem({ ...merchandiseItem, category: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={merchandiseQuantity}
                          onChange={(e) => setMerchandiseQuantity(parseInt(e.target.value) || 1)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={merchandiseItem.description}
                        onChange={(e) => setMerchandiseItem({ ...merchandiseItem, description: e.target.value })}
                        rows={2}
                      />
                    </div>

                    {merchandiseItem.possible_locations?.length > 0 && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Locations
                        </Label>
                        <div className="space-y-2">
                          {merchandiseItem.possible_locations.map((loc, idx) => (
                            <div
                              key={idx}
                              className={`flex items-center gap-3 p-3 rounded-lg border ${
                                selectedLocations.has(idx) ? 'border-primary bg-primary/5' : 'border-muted'
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
                      </div>
                    )}

                    {merchandiseItem.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {merchandiseItem.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">{tag}</Badge>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Textarea
                        value={merchandiseNotes}
                        onChange={(e) => setMerchandiseNotes(e.target.value)}
                        rows={2}
                        placeholder="Additional notes..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={reset}>Start Over</Button>
                    <Button
                      onClick={submitMerchandiseRequest}
                      disabled={submitting || !merchandiseItem.item_name || (!customerId && !selectedCustomerId)}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Create Request
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Multi-Customer Review */}
              {detectedMode === 'messages' && (
                <div className="space-y-4">
                  {rawText && (
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                        <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
                        Show extracted text
                      </summary>
                      <div className="mt-2 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                        {rawText}
                      </div>
                    </details>
                  )}

                  {/* Customer Cards */}
                  {parsedCustomers.map((customer, customerIndex) => (
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
                                <p className="text-sm text-muted-foreground">{customer.customer_identifier}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getUrgencyColor(customer.urgency)}>{customer.urgency}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateCustomer(customerIndex, 'expanded', !customer.expanded)}
                            >
                              {customer.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
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

                            {customer.customer_matches.length > 0 && (
                              <div className="space-y-2">
                                {customer.customer_matches.slice(0, 3).map((match) => (
                                  <div
                                    key={match.id}
                                    onClick={() => {
                                      updateCustomer(customerIndex, 'selectedCustomerId', match.id);
                                      updateCustomer(customerIndex, 'createNewCustomer', false);
                                    }}
                                    className={`p-2 rounded-lg border cursor-pointer transition-colors ${
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
                                        {match.match_score}%
                                      </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">{match.match_reason}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div
                              onClick={() => {
                                updateCustomer(customerIndex, 'createNewCustomer', true);
                                updateCustomer(customerIndex, 'selectedCustomerId', null);
                              }}
                              className={`p-2 rounded-lg border cursor-pointer ${
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
                                <Input
                                  value={customer.customer_name}
                                  onChange={(e) => updateCustomer(customerIndex, 'customer_name', e.target.value)}
                                  placeholder="Name"
                                />
                                <Input
                                  type="email"
                                  value={customer.newCustomerEmail}
                                  onChange={(e) => updateCustomer(customerIndex, 'newCustomerEmail', e.target.value)}
                                  placeholder="Email (optional)"
                                />
                              </div>
                            )}
                          </div>

                          {/* Items */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Items</Label>
                              <Button variant="outline" size="sm" onClick={() => addItem(customerIndex)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add
                              </Button>
                            </div>

                            {customer.items.map((item, itemIndex) => (
                              <div key={itemIndex} className="flex gap-2 items-start">
                                <Input
                                  value={item.item_name}
                                  onChange={(e) => updateItem(customerIndex, itemIndex, 'item_name', e.target.value)}
                                  placeholder="Item name"
                                  className="flex-1"
                                />
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateItem(customerIndex, itemIndex, 'quantity', parseInt(e.target.value) || 1)}
                                  className="w-16"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive"
                                  onClick={() => removeItem(customerIndex, itemIndex)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          {/* Notes */}
                          <Textarea
                            value={customer.notes || ''}
                            onChange={(e) => updateCustomer(customerIndex, 'notes', e.target.value)}
                            rows={2}
                            placeholder="Notes..."
                          />
                        </CardContent>
                      )}
                    </Card>
                  ))}

                  {parsedCustomers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No customers found
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={reset}>Start Over</Button>
                    <Button
                      onClick={submitCustomerRequests}
                      disabled={submitting || parsedCustomers.length === 0}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Create {parsedCustomers.length} Request{parsedCustomers.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
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
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
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
                  Parse Another
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
