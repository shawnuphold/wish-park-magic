// Type checking enabled
"use client";

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Search,
  Star,
  Clock,
  Tag,
  Filter,
  ShoppingBag,
  TrendingUp,
  Loader2,
  ExternalLink,
  Bell,
  X,
  Flame,
  Calendar,
  Eye,
  CalendarClock,
  Ticket,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Park, ItemCategory, ReleaseStatus, ReleaseImage } from '@/lib/database.types';
import { getPrimaryImageUrl } from '@/lib/images/releaseImages';

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
  projected_release_date: string | null;
  actual_release_date: string | null;
  park_exclusive: boolean;
}

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  loungefly: 'Loungefly',
  ears: 'Ears',
  spirit_jersey: 'Spirit Jersey',
  popcorn_bucket: 'Popcorn Bucket',
  pins: 'Pins',
  plush: 'Plush',
  apparel: 'Apparel',
  drinkware: 'Drinkware',
  collectible: 'Collectible',
  home_decor: 'Home Decor',
  toys: 'Toys',
  jewelry: 'Jewelry',
  other: 'Other',
};

const PARK_LABELS: Record<Park, string> = {
  disney: 'Disney',
  universal: 'Universal',
  seaworld: 'SeaWorld',
};

function getCountdown(dateStr: string | null): string {
  if (!dateStr) return '';
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'Any day now!';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today!';
  if (days === 1) return 'Tomorrow!';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.ceil(days / 7)} weeks`;
  return `${Math.ceil(days / 30)} months`;
}

export default function NewReleasesPage() {
  const [justDropped, setJustDropped] = useState<NewRelease[]>([]);
  const [comingSoon, setComingSoon] = useState<NewRelease[]>([]);
  const [onRadar, setOnRadar] = useState<NewRelease[]>([]);
  const [allReleases, setAllReleases] = useState<NewRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [parkFilter, setParkFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [ageFilter, setAgeFilter] = useState<string>('60'); // Default to last 60 days
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<NewRelease | null>(null);
  const [requestForm, setRequestForm] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(24); // Show 24 initially
  const [loadingMore, setLoadingMore] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchReleases = async () => {
      try {
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

        // Fetch Just Dropped (available in last 14 days)
        const { data: dropped } = await supabase
          .from('new_releases')
          .select('*')
          .eq('status', 'available')
          .is('merged_into_id', null)
          .gte('actual_release_date', fourteenDaysAgo.toISOString().split('T')[0])
          .order('actual_release_date', { ascending: false })
          .limit(8);

        setJustDropped(dropped || []);

        // Fetch Coming Soon
        const { data: upcoming } = await supabase
          .from('new_releases')
          .select('*')
          .eq('status', 'coming_soon')
          .is('merged_into_id', null)
          .order('projected_release_date', { ascending: true })
          .limit(8);

        setComingSoon(upcoming || []);

        // Fetch On Our Radar (rumored + announced)
        const { data: radar } = await supabase
          .from('new_releases')
          .select('*')
          .in('status', ['rumored', 'announced'])
          .is('merged_into_id', null)
          .order('created_at', { ascending: false })
          .limit(8);

        setOnRadar(radar || []);

        // Fetch all for browse section - ordered by release_date (article date) newest first
        let query = supabase
          .from('new_releases')
          .select('*')
          .is('merged_into_id', null)
          .order('release_date', { ascending: false }); // Newest first by article date

        // Apply age filter
        if (ageFilter !== 'all') {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - parseInt(ageFilter));
          query = query.gte('release_date', daysAgo.toISOString().split('T')[0]);
        }

        if (parkFilter !== 'all') {
          query = query.eq('park', parkFilter);
        }
        if (categoryFilter !== 'all') {
          query = query.eq('category', categoryFilter);
        }

        const { data } = await query;
        setAllReleases(data || []);
      } catch (error) {
        console.error('Error fetching releases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReleases();
  }, [parkFilter, categoryFilter, ageFilter]);

  const handleRequestItem = (release: NewRelease) => {
    setSelectedRelease(release);
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedRelease || !requestForm.name || !requestForm.email) return;

    setSubmitting(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Request Submitted!',
        description: `We'll reach out about ${selectedRelease.title} soon.`,
      });

      setShowRequestModal(false);
      setSelectedRelease(null);
      setRequestForm({ name: '', email: '', phone: '', notes: '' });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to submit request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getParkColor = (park: Park) => {
    const colors: Record<Park, string> = {
      disney: 'bg-blue-500 text-white',
      universal: 'bg-purple-500 text-white',
      seaworld: 'bg-cyan-500 text-white',
    };
    return colors[park];
  };

  const getDemandLabel = (score: number | null) => {
    if (!score) return null;
    if (score >= 8) return { label: 'Hot', color: 'bg-red-500 text-white' };
    if (score >= 6) return { label: 'Popular', color: 'bg-orange-500 text-white' };
    return null;
  };

  const filteredReleases = allReleases.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.ai_tags && r.ai_tags.some(tag => tag.toLowerCase().includes(search.toLowerCase())))
  );

  // Paginated releases for display
  const displayedReleases = filteredReleases.slice(0, displayLimit);
  const hasMoreReleases = filteredReleases.length > displayLimit;

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 24);
      setLoadingMore(false);
    }, 300);
  };

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(24);
  }, [search, parkFilter, categoryFilter, ageFilter]);

  const ReleaseCard = ({ release, showCountdown = false }: { release: NewRelease; showCountdown?: boolean }) => {
    // Get public image URL (excludes shopDisney images)
    const imageUrl = getPrimaryImageUrl(release.images || [], release.image_url, true);

    return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all h-full flex flex-col">
      <div className="relative aspect-square bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={release.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge className={getParkColor(release.park)} variant="secondary">
            {PARK_LABELS[release.park]}
          </Badge>
          {release.park_exclusive && (
            <Badge variant="secondary" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
              <Ticket className="w-3 h-3 mr-1" />
              Park Only
            </Badge>
          )}
          {release.is_limited_edition && (
            <Badge variant="secondary" className="bg-gold/90 text-white">
              Limited
            </Badge>
          )}
        </div>
        {getDemandLabel(release.ai_demand_score) && (
          <Badge className={`absolute top-2 right-2 ${getDemandLabel(release.ai_demand_score)!.color}`}>
            <TrendingUp className="w-3 h-3 mr-1" />
            {getDemandLabel(release.ai_demand_score)!.label}
          </Badge>
        )}
        {showCountdown && release.projected_release_date && (
          <div className="absolute bottom-2 left-2 right-2">
            <Badge className="bg-purple-600 text-white w-full justify-center py-1">
              <CalendarClock className="w-3 h-3 mr-1" />
              {getCountdown(release.projected_release_date)}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-4 flex-1 flex flex-col">
        <Badge variant="outline" className="w-fit mb-2 capitalize">
          {CATEGORY_LABELS[release.category]}
        </Badge>
        <h3 className="font-medium mb-1 line-clamp-2 flex-1">
          {release.title}
        </h3>
        {release.ai_tags && release.ai_tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {release.ai_tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="text-xs text-muted-foreground flex items-center gap-0.5">
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-auto pt-3 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-3 h-3" />
            {release.actual_release_date
              ? new Date(release.actual_release_date).toLocaleDateString()
              : release.projected_release_date
              ? `Est. ${new Date(release.projected_release_date).toLocaleDateString()}`
              : new Date(release.release_date).toLocaleDateString()}
          </div>
          {release.price_estimate && (
            <span className="font-semibold">
              ~${release.price_estimate.toFixed(0)}
            </span>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleRequestItem(release)}
          >
            Request
          </Button>
          {release.source_url && (
            <Button
              size="sm"
              variant="outline"
              asChild
            >
              <a href={release.source_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
  };

  return (
    <main className="pt-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-magic via-purple-700 to-magic py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/stars.svg')] opacity-20" />
        <div className="container-wide relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-sm text-white/90">AI-Powered Merchandise Discovery</span>
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              New Releases
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto">
              Stay ahead of the magic with our AI-curated feed of the latest Disney, Universal, and SeaWorld merchandise.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Just Dropped Section */}
      {justDropped.length > 0 && (
        <section className="py-12 bg-gradient-to-b from-red-50 to-white dark:from-red-950/20 dark:to-background">
          <div className="container-wide">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold">Just Dropped</h2>
                <p className="text-sm text-muted-foreground">Available now at the parks</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {justDropped.map((release, index) => (
                <motion.div
                  key={release.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ReleaseCard release={release} />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Coming Soon Section */}
      {comingSoon.length > 0 && (
        <section className="py-12 bg-gradient-to-b from-purple-50 to-white dark:from-purple-950/20 dark:to-background">
          <div className="container-wide">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold">Coming Soon</h2>
                <p className="text-sm text-muted-foreground">Mark your calendars for these upcoming releases</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {comingSoon.map((release, index) => (
                <motion.div
                  key={release.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ReleaseCard release={release} showCountdown />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* On Our Radar Section */}
      {onRadar.length > 0 && (
        <section className="py-12 bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-background">
          <div className="container-wide">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="font-heading text-xl font-bold">On Our Radar</h2>
                <p className="text-sm text-muted-foreground">Rumored and announced - not yet confirmed</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {onRadar.map((release, index) => {
                const radarImageUrl = getPrimaryImageUrl(release.images || [], release.image_url, true);
                return (
                <motion.div
                  key={release.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden group hover:shadow-lg transition-all h-full flex flex-col opacity-90">
                    <div className="relative aspect-square bg-muted">
                      {radarImageUrl ? (
                        <img
                          src={radarImageUrl}
                          alt={release.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 grayscale-[30%]"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                        <Badge className={getParkColor(release.park)} variant="secondary">
                          {PARK_LABELS[release.park]}
                        </Badge>
                        <Badge variant="secondary" className="bg-gray-600 text-white">
                          {release.status === 'rumored' ? 'Rumored' : 'Announced'}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4 flex-1 flex flex-col">
                      <Badge variant="outline" className="w-fit mb-2 capitalize">
                        {CATEGORY_LABELS[release.category]}
                      </Badge>
                      <h3 className="font-medium mb-1 line-clamp-2 flex-1">
                        {release.title}
                      </h3>
                      {release.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {release.description}
                        </p>
                      )}
                      <div className="flex gap-2 mt-3 pt-3 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRequestItem(release)}
                        >
                          <Bell className="w-3 h-3 mr-1" />
                          Notify Me
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Tab Filters */}
      <section className="sticky top-16 z-30 bg-white dark:bg-gray-900 backdrop-blur-sm border-b shadow-sm">
        <div className="container-wide">
          {/* Park Tabs - horizontal scroll on mobile */}
          <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="flex gap-1 min-w-max py-2">
              <Button
                variant={parkFilter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setParkFilter('all')}
                className={parkFilter === 'all' ? 'bg-primary text-white' : 'text-gray-700 dark:text-gray-200'}
              >
                All Parks
              </Button>
              <Button
                variant={parkFilter === 'disney' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setParkFilter('disney')}
                className={parkFilter === 'disney' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-gray-700 dark:text-gray-200'}
              >
                Disney
              </Button>
              <Button
                variant={parkFilter === 'universal' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setParkFilter('universal')}
                className={parkFilter === 'universal' ? 'bg-purple-600 text-white hover:bg-purple-700' : 'text-gray-700 dark:text-gray-200'}
              >
                Universal
              </Button>
              <Button
                variant={parkFilter === 'seaworld' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setParkFilter('seaworld')}
                className={parkFilter === 'seaworld' ? 'bg-cyan-600 text-white hover:bg-cyan-700' : 'text-gray-700 dark:text-gray-200'}
              >
                SeaWorld
              </Button>
            </div>
          </div>

          {/* Search and Filters Row */}
          <div className="flex flex-wrap items-center gap-4 py-4">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search releases or tags..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="60">Last 60 days</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(search || parkFilter !== 'all' || categoryFilter !== 'all' || ageFilter !== '60') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setParkFilter('all');
                  setCategoryFilter('all');
                  setAgeFilter('60');
                }}
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* All Releases Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <h2 className="font-heading text-xl font-bold mb-6">Browse All Releases</h2>
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
          ) : filteredReleases.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-heading text-xl font-bold mb-2">No Releases Found</h3>
              <p className="text-muted-foreground">
                {search ? 'Try a different search term' : 'Check back soon for new releases!'}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-6">
                <p className="text-muted-foreground">
                  Showing {displayedReleases.length} of {filteredReleases.length} release{filteredReleases.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {displayedReleases.map((release, index) => (
                  <motion.div
                    key={release.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.05, 0.3) }}
                  >
                    <ReleaseCard release={release} showCountdown={release.status === 'coming_soon'} />
                  </motion.div>
                ))}
              </div>
              {hasMoreReleases && (
                <div className="flex justify-center mt-8">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="min-w-[200px]"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Load More ({filteredReleases.length - displayLimit} remaining)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Notification CTA */}
      <section className="py-16 bg-magic text-white">
        <div className="container-wide text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gold" />
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">
            Never Miss a Drop
          </h2>
          <p className="text-white/80 max-w-md mx-auto mb-6">
            Get notified when new merchandise matching your interests is discovered.
          </p>
          <Button variant="outline" className="border-white text-white hover:bg-white hover:text-magic">
            Coming Soon
          </Button>
        </div>
      </section>

      {/* Request Modal */}
      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedRelease?.status === 'rumored' || selectedRelease?.status === 'announced'
                ? 'Get Notified'
                : 'Request This Item'}
            </DialogTitle>
            <DialogDescription>
              {selectedRelease?.status === 'rumored' || selectedRelease?.status === 'announced'
                ? "We'll notify you when this item becomes available."
                : "Fill out the form below and we'll reach out to help you get this item."}
            </DialogDescription>
          </DialogHeader>
          {selectedRelease && (
            <div className="flex gap-4 p-3 bg-muted rounded-lg mb-4">
              {selectedRelease.image_url && (
                <img
                  src={selectedRelease.image_url}
                  alt={selectedRelease.title}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-2">{selectedRelease.title}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {PARK_LABELS[selectedRelease.park]} • {CATEGORY_LABELS[selectedRelease.category]}
                </p>
                {selectedRelease.price_estimate && (
                  <p className="text-sm font-semibold">~${selectedRelease.price_estimate.toFixed(0)}</p>
                )}
              </div>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={requestForm.name}
                onChange={(e) => setRequestForm({ ...requestForm, name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div>
              <Label>Email *</Label>
              <Input
                type="email"
                value={requestForm.email}
                onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
                placeholder="your@email.com"
              />
            </div>
            <div>
              <Label>Phone (optional)</Label>
              <Input
                type="tel"
                value={requestForm.phone}
                onChange={(e) => setRequestForm({ ...requestForm, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea
                value={requestForm.notes}
                onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                placeholder="Any special requests or preferences..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowRequestModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              disabled={submitting || !requestForm.name || !requestForm.email}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                selectedRelease?.status === 'rumored' || selectedRelease?.status === 'announced'
                  ? 'Notify Me'
                  : 'Submit Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
