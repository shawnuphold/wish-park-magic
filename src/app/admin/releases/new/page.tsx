// @ts-nocheck
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ImageUploader } from '@/components/ImageUploader';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertTriangle,
  Camera,
  Save,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Park, ItemCategory, ReleaseStatus, ReleaseImage } from '@/lib/database.types';
import { generateCanonicalName } from '@/lib/ai/deduplication';

const PARKS: { value: Park; label: string }[] = [
  { value: 'disney', label: 'Disney World' },
  { value: 'universal', label: 'Universal Orlando' },
  { value: 'seaworld', label: 'SeaWorld' },
];

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'plush', label: 'Plush' },
  { value: 'pins', label: 'Pins' },
  { value: 'spirit_jersey', label: 'Spirit Jersey' },
  { value: 'loungefly', label: 'Loungefly' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'home_decor', label: 'Home' },
  { value: 'ears', label: 'Ears' },
  { value: 'collectible', label: 'MagicBand/Collectible' },
  { value: 'popcorn_bucket', label: 'Popcorn Bucket' },
  { value: 'drinkware', label: 'Drinkware' },
  { value: 'toys', label: 'Toys' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'other', label: 'Other' },
];

const STATUSES: { value: ReleaseStatus; label: string }[] = [
  { value: 'available', label: 'Available Now' },
  { value: 'coming_soon', label: 'Coming Soon' },
  { value: 'announced', label: 'Announced' },
  { value: 'rumored', label: 'Rumored' },
];

interface SimilarRelease {
  id: string;
  title: string;
  canonical_name: string | null;
  image_url: string;
}

export default function NewReleasePage() {
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [similarReleases, setSimilarReleases] = useState<SimilarRelease[]>([]);
  const [showDupeDialog, setShowDupeDialog] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    park: 'disney' as Park,
    category: 'other' as ItemCategory,
    status: 'available' as ReleaseStatus,
    price: '',
    projectedDate: '',
    isLimitedEdition: false,
    images: [] as string[],
  });

  const updateForm = (updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
  };

  const checkForDuplicates = async (name: string): Promise<SimilarRelease[]> => {
    if (!name || name.length < 3) return [];

    const canonicalName = generateCanonicalName(name);

    try {
      // Check for exact canonical match
      const { data: exactMatch } = await (supabase as any)
        .from('new_releases')
        .select('id, title, canonical_name, image_url')
        .eq('canonical_name', canonicalName)
        .is('merged_into_id', null)
        .limit(5);

      if (exactMatch && exactMatch.length > 0) {
        return exactMatch as SimilarRelease[];
      }

      // Fuzzy search by words in name
      const words = name.split(' ').filter(w => w.length > 3).slice(0, 3);
      if (words.length === 0) return [];

      const searchPattern = words.join('%');
      const { data: fuzzyMatch } = await (supabase as any)
        .from('new_releases')
        .select('id, title, canonical_name, image_url')
        .is('merged_into_id', null)
        .ilike('title', `%${searchPattern}%`)
        .limit(5);

      return (fuzzyMatch || []) as SimilarRelease[];
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return [];
    }
  };

  const handleNameBlur = async () => {
    if (!form.name || form.name.length < 3) return;

    setCheckingDupes(true);
    const similar = await checkForDuplicates(form.name);
    setSimilarReleases(similar);
    setCheckingDupes(false);

    if (similar.length > 0) {
      setShowDupeDialog(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a product name',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const canonicalName = generateCanonicalName(form.name);

      // Convert uploaded images to ReleaseImage format with source='manual'
      const releaseImages: ReleaseImage[] = form.images.map(url => ({
        url,
        source: 'manual' as const,
        caption: '',
        uploaded_at: new Date().toISOString(),
      }));

      const { data: newRelease, error } = await (supabase as any)
        .from('new_releases')
        .insert({
          title: form.name.trim(),
          description: form.description.trim() || null,
          park: form.park,
          category: form.category,
          status: form.status,
          price_estimate: form.price ? parseFloat(form.price) : null,
          projected_release_date: form.status === 'coming_soon' && form.projectedDate ? form.projectedDate : null,
          actual_release_date: form.status === 'available' ? new Date().toISOString().split('T')[0] : null,
          is_limited_edition: form.isLimitedEdition,
          canonical_name: canonicalName,
          image_url: form.images[0] || '',
          images: releaseImages,
          source: 'Manual Entry',
          source_url: '',
          release_date: new Date().toISOString(),
          available_online: false, // Manual entries are park exclusive by default
          is_featured: false,
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Release Added!',
        description: `${form.name} has been added successfully.`,
      });

      // Redirect to the new release detail page
      router.push(`/admin/releases/${newRelease?.id}`);
    } catch (error) {
      console.error('Error creating release:', error);
      toast({
        title: 'Error',
        description: 'Failed to create release. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMergeInto = (targetId: string) => {
    setShowDupeDialog(false);
    router.push(`/admin/releases/${targetId}`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-bold">Add New Release</h1>
          <p className="text-muted-foreground">
            Found something at the park? Add it here!
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload - Prominent at top for mobile */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="w-5 h-5 text-gold" />
              Product Photo
            </CardTitle>
            <CardDescription>
              Take a photo or upload from your gallery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUploader
              images={form.images}
              onImagesChange={(images) => updateForm({ images })}
              folder="reference-images"
              maxImages={5}
              showCamera={true}
              compact={false}
            />
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-gold" />
              Product Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <div className="relative">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  onBlur={handleNameBlur}
                  placeholder="Mickey Mouse 50th Anniversary Plush"
                  className="text-lg"
                />
                {checkingDupes && (
                  <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                )}
              </div>
              {similarReleases.length > 0 && !showDupeDialog && (
                <p className="text-sm text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Similar products found - click to review
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="p-0 h-auto"
                    onClick={() => setShowDupeDialog(true)}
                  >
                    View
                  </Button>
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Brief description of the item..."
                rows={3}
              />
            </div>

            {/* Park & Category - Side by side on larger screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Park</Label>
                <Select
                  value={form.park}
                  onValueChange={(v) => updateForm({ park: v as Park })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PARKS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => updateForm({ category: v as ItemCategory })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status & Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => updateForm({ status: v as ReleaseStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price (what you paid)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => updateForm({ price: e.target.value })}
                    placeholder="29.99"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>

            {/* Projected Date (only for coming_soon) */}
            {form.status === 'coming_soon' && (
              <div className="space-y-2">
                <Label htmlFor="projectedDate">Expected Release Date</Label>
                <Input
                  id="projectedDate"
                  type="date"
                  value={form.projectedDate}
                  onChange={(e) => updateForm({ projectedDate: e.target.value })}
                />
              </div>
            )}

            {/* Limited Edition Toggle */}
            <div className="flex items-center justify-between py-2">
              <div>
                <Label htmlFor="limited" className="text-base">Limited Edition</Label>
                <p className="text-sm text-muted-foreground">
                  Is this a limited release?
                </p>
              </div>
              <Switch
                id="limited"
                checked={form.isLimitedEdition}
                onCheckedChange={(c) => updateForm({ isLimitedEdition: c })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit Button - Fixed at bottom on mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:static md:p-0 md:bg-transparent md:border-0">
          <Button
            type="submit"
            className="w-full md:w-auto"
            size="lg"
            disabled={loading || !form.name.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Add Release
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDupeDialog} onOpenChange={setShowDupeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Similar Products Found
            </DialogTitle>
            <DialogDescription>
              We found products that might be the same. You can merge into an existing entry or continue creating a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {similarReleases.map((release) => (
              <div
                key={release.id}
                className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                onClick={() => handleMergeInto(release.id)}
              >
                {release.image_url && (
                  <img
                    src={release.image_url}
                    alt={release.title}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{release.title}</p>
                  <Badge variant="outline" className="text-xs">
                    View & Merge
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDupeDialog(false)}>
              Continue Creating New
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
