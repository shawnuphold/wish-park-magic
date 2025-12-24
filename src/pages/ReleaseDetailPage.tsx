import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, ExternalLink, Share2, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RequestModal } from '@/components/new-releases/RequestModal';
import { ProductCard } from '@/components/new-releases/ProductCard';

interface Product {
  id: string;
  title: string;
  description: string | null;
  park: 'disney' | 'universal' | 'seaworld';
  category: string;
  image_url: string;
  source_url: string;
  source: string;
  price_estimate: number | null;
  release_date: string;
  is_limited_edition: boolean;
  location_info: string | null;
}

function ParkName(park: string) {
  switch (park) {
    case 'disney': return 'Walt Disney World';
    case 'universal': return 'Universal Orlando';
    case 'seaworld': return 'SeaWorld Orlando';
    default: return park;
  }
}

export default function ReleaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch product details
  const { data: product, isLoading } = useQuery({
    queryKey: ['release', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('new_releases')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Product | null;
    },
  });

  // Fetch similar products
  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar-releases', product?.category, product?.id],
    queryFn: async () => {
      if (!product) return [];
      
      const { data, error } = await supabase
        .from('new_releases')
        .select('*')
        .eq('status', 'active')
        .eq('category', product.category)
        .neq('id', product.id)
        .limit(4);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!product,
  });

  const handleShare = async () => {
    if (navigator.share && product) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out this new release at ${ParkName(product.park)}!`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share failed
      }
    }
  };

  const releaseDate = product ? new Date(product.release_date) : null;
  const daysSinceRelease = releaseDate 
    ? Math.floor((Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isNew = daysSinceRelease < 3;

  if (isLoading) {
    return (
      <main className="min-h-screen pt-24 pb-16">
        <div className="container-wide">
          <Skeleton className="w-24 h-8 mb-8" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold mb-4">Product Not Found</h1>
          <p className="text-muted-foreground mb-6">This item may no longer be available.</p>
          <Button asChild>
            <Link to="/new-releases">Browse All Releases</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-24 pb-16">
      <div className="container-wide">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            to="/new-releases"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to New Releases
          </Link>
        </motion.div>

        {/* Product Details */}
        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            <a
              href={product.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group"
            >
              <img
                src={product.image_url}
                alt={`${product.title} - New merchandise at ${ParkName(product.park)}`}
                className="w-full aspect-square object-cover rounded-xl shadow-elevated"
              />
              
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-midnight/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                <div className="flex items-center gap-2 text-white">
                  <Camera className="w-5 h-5" />
                  <span>View original source</span>
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {isNew && (
                  <Badge className="bg-gold text-midnight font-bold">NEW</Badge>
                )}
                {product.is_limited_edition && (
                  <Badge className="bg-destructive text-destructive-foreground font-bold">LIMITED</Badge>
                )}
              </div>
            </a>

            {/* Source Attribution */}
            <a
              href={product.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Camera className="w-4 h-4" />
              📷 Source: {product.source}
              <ExternalLink className="w-3 h-3" />
            </a>
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <div>
              <p className="text-sm text-gold font-medium mb-2">{ParkName(product.park)}</p>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
                {product.title}
              </h1>
              
              {product.price_estimate && (
                <p className="text-2xl font-bold text-gold">
                  ~${product.price_estimate.toFixed(2)}
                </p>
              )}
            </div>

            {product.description && (
              <p className="text-muted-foreground">{product.description}</p>
            )}

            {product.location_info && (
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <MapPin className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Where to Find It</p>
                  <p className="text-sm text-muted-foreground">{product.location_info}</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="gold" 
                size="lg" 
                className="flex-1"
                onClick={() => setIsModalOpen(true)}
              >
                Request This Item
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Released {releaseDate?.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Similar Items */}
        {similarProducts.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-16"
          >
            <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
              Similar Items
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {similarProducts.map((item) => (
                <Link key={item.id} to={`/new-releases/${item.id}`}>
                  <ProductCard 
                    product={item} 
                    onRequestClick={() => {
                      setIsModalOpen(true);
                    }}
                  />
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </div>

      {/* Request Modal */}
      <RequestModal
        product={product}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
