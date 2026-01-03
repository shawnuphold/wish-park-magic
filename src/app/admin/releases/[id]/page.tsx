// @ts-nocheck
"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
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
import {
  ArrowLeft,
  Save,
  Trash2,
  ExternalLink,
  Calendar,
  Merge,
  CheckCircle,
  Loader2,
  Link as LinkIcon,
  Clock,
  TrendingUp,
  Tag,
  Ban,
  Ticket,
  Globe,
} from 'lucide-react';
import type { Park, ItemCategory, ReleaseStatus, ReleaseImage } from '@/lib/database.types';
import { ReleaseImageGallery } from '@/components/releases/ReleaseImageGallery';
import { useToast } from '@/hooks/use-toast';

interface NewRelease {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  images: ReleaseImage[];
  source_url: string;
  source: string;
  park: Park;
  category: ItemCategory;
  price_estimate: number | null;
  release_date: string;
  is_limited_edition: boolean;
  is_featured: boolean;
  ai_tags: string[] | null;
  ai_demand_score: number | null;
  status: ReleaseStatus;
  canonical_name: string | null;
  projected_release_date: string | null;
  actual_release_date: string | null;
  sold_out_date: string | null;
  merged_into_id: string | null;
  location: string | null;
  park_exclusive: boolean;
  available_online: boolean;
  online_price: number | null;
  online_url: string | null;
}

interface ArticleSource {
  id: string;
  source_url: string;
  source_name: string | null;
  article_title: string | null;
  discovered_at: string;
  snippet: string | null;
}

interface SimilarRelease {
  id: string;
  title: string;
  status: ReleaseStatus;
  image_url: string | null;
}

const STATUS_OPTIONS: { value: ReleaseStatus; label: string; color: string }[] = [
  { value: 'rumored', label: 'Rumored', color: 'bg-gray-500' },
  { value: 'announced', label: 'Announced', color: 'bg-blue-500' },
  { value: 'coming_soon', label: 'Coming Soon', color: 'bg-yellow-500' },
  { value: 'available', label: 'Available', color: 'bg-green-500' },
  { value: 'sold_out', label: 'Sold Out', color: 'bg-red-500' },
];

const CATEGORIES: ItemCategory[] = [
  'loungefly', 'ears', 'spirit_jersey', 'popcorn_bucket', 'pins',
  'plush', 'apparel', 'drinkware', 'collectible', 'home_decor', 'toys', 'jewelry', 'other'
];

const PARKS: Park[] = ['disney', 'universal', 'seaworld'];

export default function ReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [release, setRelease] = useState<NewRelease | null>(null);
  const [sources, setSources] = useState<ArticleSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeSearch, setMergeSearch] = useState('');
  const [mergeResults, setMergeResults] = useState<SimilarRelease[]>([]);
  const [selectedMergeTarget, setSelectedMergeTarget] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'announced' as ReleaseStatus,
    park: 'disney' as Park,
    category: 'other' as ItemCategory,
    price_estimate: '',
    is_limited_edition: false,
    is_featured: false,
    projected_release_date: '',
    actual_release_date: '',
    ai_tags: '',
  });

  useEffect(() => {
    const fetchRelease = async () => {
      try {
        // Fetch release
        const { data: releaseData, error: releaseError } = await supabase
          .from('new_releases')
          .select('*')
          .eq('id', id)
          .single();

        if (releaseError) throw releaseError;
        const release = releaseData as any;
        setRelease(release as NewRelease);

        // Initialize form
        setFormData({
          title: release.title,
          description: release.description || '',
          status: release.status || 'announced',
          park: release.park,
          category: release.category,
          price_estimate: release.price_estimate?.toString() || '',
          is_limited_edition: release.is_limited_edition,
          is_featured: release.is_featured,
          projected_release_date: release.projected_release_date || '',
          actual_release_date: release.actual_release_date || '',
          ai_tags: release.ai_tags?.join(', ') || '',
        });

        // Fetch article sources (table may not exist in generated types yet)
        const { data: sourcesData } = await (supabase as any)
          .from('release_article_sources')
          .select('*')
          .eq('release_id', id)
          .order('discovered_at', { ascending: false });

        setSources(sourcesData || []);
      } catch (error) {
        console.error('Error fetching release:', error);
        toast({
          title: 'Error',
          description: 'Failed to load release',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRelease();
  }, [id, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        park: formData.park,
        category: formData.category,
        price_estimate: formData.price_estimate ? parseFloat(formData.price_estimate) : null,
        is_limited_edition: formData.is_limited_edition,
        is_featured: formData.is_featured,
        projected_release_date: formData.projected_release_date || null,
        actual_release_date: formData.actual_release_date || null,
        ai_tags: formData.ai_tags ? formData.ai_tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      };

      // Auto-set dates based on status
      if (formData.status === 'available' && !formData.actual_release_date) {
        updateData.actual_release_date = new Date().toISOString().split('T')[0];
      }
      if (formData.status === 'sold_out' && release && !release.sold_out_date) {
        updateData.sold_out_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('new_releases')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Release Updated' });
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAvailable = async () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      ...formData,
      status: 'available',
      actual_release_date: today,
    });

    // Also save immediately
    try {
      await supabase
        .from('new_releases')
        .update({
          status: 'available',
          actual_release_date: today,
        } as any)
        .eq('id', id);

      toast({ title: 'Marked as Available' });
      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleMarkSoldOut = async () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      ...formData,
      status: 'sold_out',
    });

    try {
      await supabase
        .from('new_releases')
        .update({
          status: 'sold_out',
          sold_out_date: today,
        } as any)
        .eq('id', id);

      toast({ title: 'Marked as Sold Out' });
      router.refresh();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this release?')) return;

    try {
      const { error } = await supabase
        .from('new_releases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Release Deleted' });
      router.push('/admin/releases');
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete release',
        variant: 'destructive',
      });
    }
  };

  const handleSearchMerge = async () => {
    if (!mergeSearch.trim()) return;

    try {
      const { data } = await (supabase as any)
        .from('new_releases')
        .select('id, title, status, image_url')
        .neq('id', id)
        .is('merged_into_id', null)
        .ilike('title', `%${mergeSearch}%`)
        .limit(10);

      setMergeResults((data || []) as SimilarRelease[]);
    } catch {
      // Ignore errors
    }
  };

  const handleMerge = async () => {
    if (!selectedMergeTarget) return;

    try {
      // Call the merge function via RPC
      const { error } = await (supabase as any).rpc('merge_releases', {
        source_release_id: id,
        target_release_id: selectedMergeTarget,
      });

      if (error) throw error;

      toast({ title: 'Releases Merged' });
      router.push(`/admin/releases/${selectedMergeTarget}`);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to merge releases',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: ReleaseStatus) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Release not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/admin/releases')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Releases
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/releases')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">{release.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${getStatusColor(release.status)} text-white`}>
                {STATUS_OPTIONS.find(s => s.value === release.status)?.label}
              </Badge>
              <Badge variant="outline" className="capitalize">{release.park}</Badge>
              <Badge variant="outline" className="capitalize">{release.category.replace('_', ' ')}</Badge>
              {sources.length > 0 && (
                <Badge variant="secondary">
                  <LinkIcon className="w-3 h-3 mr-1" />
                  {sources.length} source{sources.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {release.status !== 'available' && release.status !== 'sold_out' && (
            <Button variant="outline" onClick={handleMarkAvailable}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Available
            </Button>
          )}
          {release.status === 'available' && (
            <Button variant="outline" className="text-red-600" onClick={handleMarkSoldOut}>
              <Ban className="w-4 h-4 mr-2" />
              Mark Sold Out
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowMergeDialog(true)}>
            <Merge className="w-4 h-4 mr-2" />
            Merge
          </Button>
          <Button variant="outline" className="text-red-500" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as ReleaseStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estimated Price</Label>
                  <Input
                    type="number"
                    value={formData.price_estimate}
                    onChange={(e) => setFormData({ ...formData, price_estimate: e.target.value })}
                    placeholder="29.99"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Park</Label>
                  <Select
                    value={formData.park}
                    onValueChange={(v) => setFormData({ ...formData, park: v as Park })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PARKS.map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData({ ...formData, category: v as ItemCategory })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Projected Release Date</Label>
                  <Input
                    type="date"
                    value={formData.projected_release_date}
                    onChange={(e) => setFormData({ ...formData, projected_release_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Actual Release Date</Label>
                  <Input
                    type="date"
                    value={formData.actual_release_date}
                    onChange={(e) => setFormData({ ...formData, actual_release_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.ai_tags}
                  onChange={(e) => setFormData({ ...formData, ai_tags: e.target.value })}
                  placeholder="mickey, halloween, spirit jersey"
                />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_limited_edition}
                    onChange={(e) => setFormData({ ...formData, is_limited_edition: e.target.checked })}
                    className="rounded"
                  />
                  <span>Limited Edition</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="rounded"
                  />
                  <span>Featured</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Sources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Article Sources ({sources.length})
              </CardTitle>
              <CardDescription>
                Articles and blog posts that mentioned this product
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sources.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No sources tracked yet</p>
              ) : (
                <div className="space-y-3">
                  {sources.map((source) => (
                    <div key={source.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <a
                            href={source.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-gold flex items-center gap-1"
                          >
                            {source.article_title || 'Untitled Article'}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          <p className="text-sm text-muted-foreground">
                            {source.source_name} • {new Date(source.discovered_at).toLocaleDateString()}
                          </p>
                          {source.snippet && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {source.snippet}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Images */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Images</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ReleaseImageGallery
                images={(release.images as ReleaseImage[]) || []}
                isAdmin={true}
                showBadges={true}
                className="aspect-square"
              />
            </CardContent>
          </Card>

          {/* Online Availability */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                {release.park_exclusive ? (
                  <Ticket className="w-4 h-4 text-amber-500" />
                ) : (
                  <Globe className="w-4 h-4 text-blue-500" />
                )}
                Availability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Park Exclusive:</span>
                <Badge variant={release.park_exclusive ? 'default' : 'secondary'} className={release.park_exclusive ? 'bg-amber-500' : ''}>
                  {release.park_exclusive ? 'Yes' : 'No'}
                </Badge>
              </div>
              {release.available_online && (
                <>
                  {release.online_price && (
                    <div className="flex items-center justify-between">
                      <span>Online Price:</span>
                      <span className="font-medium">${release.online_price.toFixed(2)}</span>
                    </div>
                  )}
                  {release.online_url && (
                    <a
                      href={release.online_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                    >
                      View on shopDisney
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </>
              )}
              <p className="text-xs text-muted-foreground">
                {release.park_exclusive
                  ? 'Only available at the park - great for pickup service!'
                  : 'Also available online - customers can buy direct'}
              </p>
            </CardContent>
          </Card>

          {/* AI Insights */}
          {(release.ai_demand_score || (release.ai_tags && release.ai_tags.length > 0)) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">AI Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {release.ai_demand_score && (
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Demand Score:</span>
                    <Badge variant={release.ai_demand_score >= 8 ? 'destructive' : 'secondary'}>
                      {release.ai_demand_score}/10
                    </Badge>
                  </div>
                )}
                {release.ai_tags && release.ai_tags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Tags:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {release.ai_tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>Discovered:</span>
                <span className="text-muted-foreground">
                  {new Date(release.release_date).toLocaleDateString()}
                </span>
              </div>
              {release.projected_release_date && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>Projected:</span>
                  <span className="text-muted-foreground">
                    {new Date(release.projected_release_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {release.actual_release_date && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>Released:</span>
                  <span className="text-muted-foreground">
                    {new Date(release.actual_release_date).toLocaleDateString()}
                  </span>
                </div>
              )}
              {release.sold_out_date && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  <span>Sold Out:</span>
                  <span className="text-muted-foreground">
                    {new Date(release.sold_out_date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Canonical Name */}
          {release.canonical_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Deduplication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                  {release.canonical_name}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Merge Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge with Another Release</DialogTitle>
            <DialogDescription>
              Search for another release to merge this one into. All sources will be moved to the target.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search releases..."
                value={mergeSearch}
                onChange={(e) => setMergeSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchMerge()}
              />
              <Button onClick={handleSearchMerge}>Search</Button>
            </div>
            {mergeResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mergeResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedMergeTarget === result.id ? 'border-gold bg-gold/5' : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedMergeTarget(result.id)}
                  >
                    <div className="flex items-center gap-3">
                      {result.image_url && (
                        <img
                          src={result.image_url}
                          alt=""
                          className="w-10 h-10 object-cover rounded"
                        />
                      )}
                      <div>
                        <p className="font-medium">{result.title}</p>
                        <Badge variant="outline" className="text-xs">
                          {STATUS_OPTIONS.find(s => s.value === result.status)?.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMergeDialog(false)}>Cancel</Button>
            <Button onClick={handleMerge} disabled={!selectedMergeTarget}>
              Merge Into Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
