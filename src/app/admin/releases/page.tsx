// Type checking enabled
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Sparkles,
  Calendar,
  ExternalLink,
  RefreshCw,
  Check,
  X,
  Loader2,
  Rss,
  Star,
  Trash2,
  Play,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  Eye,
  Megaphone,
  CalendarClock,
  ShoppingBag,
  XCircle,
} from 'lucide-react';
import type { Park, ItemCategory, ReleaseStatus } from '@/lib/database.types';
import { useToast } from '@/hooks/use-toast';

interface NewRelease {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
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
  projected_release_date: string | null;
  actual_release_date: string | null;
  source_count?: number;
}

interface FeedSource {
  id: string;
  name: string;
  url: string;
  type: string;
  park: Park | 'all';
  is_active: boolean;
  check_frequency_hours: number;
  last_checked: string | null;
  last_error: string | null;
}

const CATEGORIES: ItemCategory[] = [
  'loungefly', 'ears', 'spirit_jersey', 'popcorn_bucket', 'pins',
  'plush', 'apparel', 'drinkware', 'collectible', 'home_decor', 'toys', 'jewelry', 'other'
];

const PARKS: Park[] = ['disney', 'universal', 'seaworld'];

const STATUS_OPTIONS: { value: ReleaseStatus | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'all', label: 'All Status', icon: null, color: '' },
  { value: 'rumored', label: 'Rumored', icon: <Eye className="w-3 h-3" />, color: 'bg-gray-100 text-gray-700' },
  { value: 'announced', label: 'Announced', icon: <Megaphone className="w-3 h-3" />, color: 'bg-blue-100 text-blue-700' },
  { value: 'coming_soon', label: 'Coming Soon', icon: <CalendarClock className="w-3 h-3" />, color: 'bg-purple-100 text-purple-700' },
  { value: 'available', label: 'Available', icon: <ShoppingBag className="w-3 h-3" />, color: 'bg-green-100 text-green-700' },
  { value: 'sold_out', label: 'Sold Out', icon: <XCircle className="w-3 h-3" />, color: 'bg-red-100 text-red-700' },
];

function getStatusColor(status: ReleaseStatus): string {
  const colors: Record<ReleaseStatus, string> = {
    rumored: 'bg-gray-100 text-gray-700',
    announced: 'bg-blue-100 text-blue-700',
    coming_soon: 'bg-purple-100 text-purple-700',
    available: 'bg-green-100 text-green-700',
    sold_out: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

function getStatusLabel(status: ReleaseStatus): string {
  const labels: Record<ReleaseStatus, string> = {
    rumored: 'Rumored',
    announced: 'Announced',
    coming_soon: 'Coming Soon',
    available: 'Available',
    sold_out: 'Sold Out',
  };
  return labels[status] || status;
}

export default function ReleasesPage() {
  const router = useRouter();
  const [releases, setReleases] = useState<NewRelease[]>([]);
  const [rumoredCount, setRumoredCount] = useState(0);
  const [sources, setSources] = useState<FeedSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [parkFilter, setParkFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [ageFilter, setAgeFilter] = useState<string>('30'); // Default to last 30 days
  const { toast } = useToast();

  // New release form state
  const [newRelease, setNewRelease] = useState({
    title: '',
    description: '',
    image_url: '',
    source_url: '',
    park: 'disney' as Park,
    category: 'other' as ItemCategory,
    price_estimate: '',
    is_limited_edition: false,
    is_featured: false,
    ai_tags: '',
  });

  // New source form state
  const [newSource, setNewSource] = useState({
    name: '',
    url: '',
    type: 'rss',
    park: 'all' as Park | 'all',
    check_frequency_hours: 4,
  });

  const fetchReleases = useCallback(async () => {
    try {
      // Fetch releases
      let query = (supabase as any)
        .from('new_releases')
        .select('*')
        .is('merged_into_id', null) // Don't show merged releases
        .order('created_at', { ascending: false });

      // Apply age filter
      if (ageFilter !== 'all') {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(ageFilter));
        query = query.gte('created_at', daysAgo.toISOString());
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (parkFilter !== 'all') {
        query = query.eq('park', parkFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      setReleases(data || []);

      // Get count of rumored/announced for "needs attention" indicator
      const { count } = await supabase
        .from('new_releases')
        .select('*', { count: 'exact', head: true })
        .is('merged_into_id', null)
        .in('status', ['rumored', 'announced']);
      setRumoredCount(count || 0);
    } catch (error) {
      console.error('Error fetching releases:', error);
    }
  }, [statusFilter, parkFilter, ageFilter]);

  const fetchSources = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('feed_sources')
        .select('*')
        .order('name');

      if (error) throw error;
      setSources(data || []);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  };

  useEffect(() => {
    Promise.all([fetchReleases(), fetchSources()]).finally(() => setLoading(false));
  }, [fetchReleases]);

  const handleProcessFeeds = async (sourceId?: string) => {
    setProcessing(true);
    try {
      const response = await fetch('/api/releases/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sourceId ? { sourceId } : {}),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      toast({
        title: 'Feeds Processed',
        description: sourceId
          ? `${result.itemsCreated} items found from ${result.sourceName}`
          : `Processed ${result.sourcesProcessed} sources, found ${result.totalItems} items`,
      });

      // Refresh data
      await fetchReleases();
      await fetchSources();
    } catch (error) {
      toast({
        title: 'Processing Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAvailable = async (id: string) => {
    try {
      const { error } = await supabase
        .from('new_releases')
        .update({
          status: 'available',
          actual_release_date: new Date().toISOString().split('T')[0],
        } as any)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Marked as Available' });
      await fetchReleases();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update release',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteRelease = async (id: string) => {
    if (!confirm('Are you sure you want to delete this release?')) return;

    try {
      const { error } = await supabase
        .from('new_releases')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Release Deleted' });
      await fetchReleases();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete release',
        variant: 'destructive',
      });
    }
  };

  const handleAddRelease = async () => {
    try {
      const { error } = await supabase.from('new_releases').insert({
        title: newRelease.title,
        description: newRelease.description || null,
        image_url: newRelease.image_url || '',
        source_url: newRelease.source_url || '',
        source: 'Manual',
        park: newRelease.park,
        category: newRelease.category,
        price_estimate: newRelease.price_estimate ? parseFloat(newRelease.price_estimate) : null,
        release_date: new Date().toISOString(),
        is_limited_edition: newRelease.is_limited_edition,
        is_featured: newRelease.is_featured,
        ai_tags: newRelease.ai_tags ? newRelease.ai_tags.split(',').map(t => t.trim()) : [],
        status: 'announced',
      });

      if (error) throw error;

      toast({ title: 'Release Added' });
      setShowAddDialog(false);
      setNewRelease({
        title: '',
        description: '',
        image_url: '',
        source_url: '',
        park: 'disney',
        category: 'other',
        price_estimate: '',
        is_limited_edition: false,
        is_featured: false,
        ai_tags: '',
      });
      await fetchReleases();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add release',
        variant: 'destructive',
      });
    }
  };

  const handleAddSource = async () => {
    try {
      const { error } = await supabase.from('feed_sources').insert({
        name: newSource.name,
        url: newSource.url,
        type: newSource.type,
        park: newSource.park,
        check_frequency_hours: newSource.check_frequency_hours,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: 'Source Added' });
      setShowSourceDialog(false);
      setNewSource({
        name: '',
        url: '',
        type: 'rss',
        park: 'all',
        check_frequency_hours: 4,
      });
      await fetchSources();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add source',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSource = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('feed_sources')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchSources();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update source',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSource = async (id: string) => {
    if (!confirm('Are you sure you want to delete this source?')) return;

    try {
      const { error } = await supabase
        .from('feed_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Source Deleted' });
      await fetchSources();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete source',
        variant: 'destructive',
      });
    }
  };

  const getParkColor = (park: Park | 'all') => {
    const colors: Record<string, string> = {
      disney: 'bg-blue-500/10 text-blue-600',
      universal: 'bg-purple-500/10 text-purple-600',
      seaworld: 'bg-cyan-500/10 text-cyan-600',
      all: 'bg-gray-500/10 text-gray-600',
    };
    return colors[park] || colors.all;
  };

  const getDemandColor = (score: number | null) => {
    if (!score) return 'bg-gray-100 text-gray-600';
    if (score >= 8) return 'bg-red-100 text-red-700';
    if (score >= 6) return 'bg-orange-100 text-orange-700';
    if (score >= 4) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const filteredReleases = releases.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">New Releases</h1>
          <p className="text-muted-foreground">AI-powered merchandise tracking and discovery</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleProcessFeeds()}
            disabled={processing}
          >
            {processing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Scan Feeds
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="gold">
                <Plus className="w-4 h-4 mr-2" />
                Add Release
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Release</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newRelease.title}
                    onChange={(e) => setNewRelease({ ...newRelease, title: e.target.value })}
                    placeholder="Mickey Mouse Spirit Jersey"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newRelease.description}
                    onChange={(e) => setNewRelease({ ...newRelease, description: e.target.value })}
                    placeholder="2-3 sentences about the item..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Park</Label>
                    <Select
                      value={newRelease.park}
                      onValueChange={(v) => setNewRelease({ ...newRelease, park: v as Park })}
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
                      value={newRelease.category}
                      onValueChange={(v) => setNewRelease({ ...newRelease, category: v as ItemCategory })}
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
                    <Label>Image URL</Label>
                    <Input
                      value={newRelease.image_url}
                      onChange={(e) => setNewRelease({ ...newRelease, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Estimated Price</Label>
                    <Input
                      type="number"
                      value={newRelease.price_estimate}
                      onChange={(e) => setNewRelease({ ...newRelease, price_estimate: e.target.value })}
                      placeholder="29.99"
                    />
                  </div>
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input
                    value={newRelease.ai_tags}
                    onChange={(e) => setNewRelease({ ...newRelease, ai_tags: e.target.value })}
                    placeholder="mickey, holiday, spirit jersey"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRelease.is_limited_edition}
                      onCheckedChange={(c) => setNewRelease({ ...newRelease, is_limited_edition: c })}
                    />
                    <Label>Limited Edition</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRelease.is_featured}
                      onCheckedChange={(c) => setNewRelease({ ...newRelease, is_featured: c })}
                    />
                    <Label>Featured</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                <Button onClick={handleAddRelease} disabled={!newRelease.title}>Add Release</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <ShoppingBag className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{releases.filter(r => r.status === 'available').length}</p>
                <p className="text-sm text-muted-foreground">Available Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CalendarClock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{releases.filter(r => r.status === 'coming_soon').length}</p>
                <p className="text-sm text-muted-foreground">Coming Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rumoredCount}</p>
                <p className="text-sm text-muted-foreground">On Radar</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {releases.filter(r => r.ai_demand_score && r.ai_demand_score >= 8).length}
                </p>
                <p className="text-sm text-muted-foreground">High Demand</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="releases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="releases">All Releases</TabsTrigger>
          <TabsTrigger value="radar" className="relative">
            On Radar
            {rumoredCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1">
                {rumoredCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sources">Feed Sources</TabsTrigger>
        </TabsList>

        {/* All Releases Tab */}
        <TabsContent value="releases">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search releases..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          {opt.icon}
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={parkFilter} onValueChange={setParkFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Park" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Parks</SelectItem>
                    <SelectItem value="disney">Disney</SelectItem>
                    <SelectItem value="universal">Universal</SelectItem>
                    <SelectItem value="seaworld">SeaWorld</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ageFilter} onValueChange={setAgeFilter}>
                  <SelectTrigger className="w-[140px]">
                    <Clock className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="14">Last 14 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredReleases.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No releases found</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredReleases.map((release) => (
                    <Card
                      key={release.id}
                      className="overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => router.push(`/admin/releases/${release.id}`)}
                    >
                      {release.image_url && (
                        <div className="aspect-video bg-muted relative">
                          <img
                            src={release.image_url}
                            alt={release.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 flex gap-1">
                            <Badge className={getStatusColor(release.status)}>
                              {getStatusLabel(release.status)}
                            </Badge>
                          </div>
                          {release.is_featured && (
                            <Badge className="absolute top-2 right-2 bg-gold text-white">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>
                      )}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-medium line-clamp-2">{release.title}</h3>
                          {release.ai_demand_score && (
                            <Badge className={getDemandColor(release.ai_demand_score)}>
                              {release.ai_demand_score}/10
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-2">
                          <Badge className={getParkColor(release.park)} variant="outline">
                            {release.park}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {release.category.replace('_', ' ')}
                          </Badge>
                          {release.is_limited_edition && (
                            <Badge variant="secondary">Limited</Badge>
                          )}
                          {(release.source_count ?? 0) > 0 && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {release.source_count}
                            </Badge>
                          )}
                        </div>
                        {release.ai_tags && release.ai_tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {release.ai_tags.slice(0, 3).map((tag, i) => (
                              <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {release.actual_release_date
                              ? new Date(release.actual_release_date).toLocaleDateString()
                              : release.projected_release_date
                              ? `Est. ${new Date(release.projected_release_date).toLocaleDateString()}`
                              : new Date(release.release_date).toLocaleDateString()}
                          </span>
                          {release.price_estimate && (
                            <span className="font-medium text-foreground">
                              ~${release.price_estimate.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {release.source && (
                          <p className="text-sm text-muted-foreground mt-1">
                            via {release.source}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/admin/releases/${release.id}`);
                            }}
                          >
                            Edit
                          </Button>
                          {release.status !== 'available' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAvailable(release.id);
                              }}
                            >
                              <ShoppingBag className="w-3 h-3" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRelease(release.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* On Radar Tab - Rumored and Announced */}
        <TabsContent value="radar">
          <Card>
            <CardHeader>
              <CardTitle>On Our Radar</CardTitle>
              <CardDescription>
                Rumored and announced releases that haven&apos;t been confirmed yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              {releases.filter(r => r.status === 'rumored' || r.status === 'announced').length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No rumored or announced releases yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {releases
                    .filter(r => r.status === 'rumored' || r.status === 'announced')
                    .map((release) => (
                    <div
                      key={release.id}
                      className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/admin/releases/${release.id}`)}
                    >
                      {release.image_url && (
                        <img
                          src={release.image_url}
                          alt={release.title}
                          className="w-24 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getStatusColor(release.status)}>
                                {getStatusLabel(release.status)}
                              </Badge>
                              {(release.source_count ?? 0) > 0 && (
                                <Badge variant="outline" className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  {release.source_count} sources
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium">{release.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {release.description}
                            </p>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                supabase
                                  .from('new_releases')
                                  .update({ status: 'coming_soon' })
                                  .eq('id', release.id)
                                  .then(() => fetchReleases());
                              }}
                            >
                              <CalendarClock className="w-4 h-4 mr-1" />
                              Coming Soon
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAvailable(release.id);
                              }}
                            >
                              <ShoppingBag className="w-4 h-4 mr-1" />
                              Available
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className={getParkColor(release.park)} variant="outline">
                            {release.park}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {release.category.replace('_', ' ')}
                          </Badge>
                          {release.ai_demand_score && (
                            <Badge className={getDemandColor(release.ai_demand_score)}>
                              Demand: {release.ai_demand_score}/10
                            </Badge>
                          )}
                          {release.projected_release_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Est. {new Date(release.projected_release_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            via {release.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feed Sources Tab */}
        <TabsContent value="sources">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Feed Sources</CardTitle>
                <CardDescription>
                  RSS feeds and websites monitored for new merchandise
                </CardDescription>
              </div>
              <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Source
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Feed Source</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newSource.name}
                        onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                        placeholder="BlogMickey"
                      />
                    </div>
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={newSource.url}
                        onChange={(e) => setNewSource({ ...newSource, url: e.target.value })}
                        placeholder="https://blogmickey.com/feed/"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={newSource.type}
                          onValueChange={(v) => setNewSource({ ...newSource, type: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="rss">RSS Feed</SelectItem>
                            <SelectItem value="scrape">Web Scrape</SelectItem>
                            <SelectItem value="api">API</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Park</Label>
                        <Select
                          value={newSource.park}
                          onValueChange={(v) => setNewSource({ ...newSource, park: v as Park | 'all' })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Parks</SelectItem>
                            <SelectItem value="disney">Disney</SelectItem>
                            <SelectItem value="universal">Universal</SelectItem>
                            <SelectItem value="seaworld">SeaWorld</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Check Frequency (hours)</Label>
                      <Input
                        type="number"
                        value={newSource.check_frequency_hours}
                        onChange={(e) => setNewSource({ ...newSource, check_frequency_hours: parseInt(e.target.value) || 4 })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSourceDialog(false)}>Cancel</Button>
                    <Button onClick={handleAddSource} disabled={!newSource.name || !newSource.url}>
                      Add Source
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${source.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                        <Rss className={`w-5 h-5 ${source.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{source.name}</span>
                          <Badge className={getParkColor(source.park)} variant="outline">
                            {source.park}
                          </Badge>
                          <Badge variant="outline">{source.type.toUpperCase()}</Badge>
                        </div>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {source.url.slice(0, 50)}...
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>Every {source.check_frequency_hours}h</span>
                          {source.last_checked && (
                            <span>
                              Last: {new Date(source.last_checked).toLocaleString()}
                            </span>
                          )}
                          {source.last_error && (
                            <span className="text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleProcessFeeds(source.id)}
                        disabled={processing}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Switch
                        checked={source.is_active}
                        onCheckedChange={(checked) => handleToggleSource(source.id, checked)}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDeleteSource(source.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
