import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { ProductCard } from '@/components/new-releases/ProductCard';
import { RequestModal } from '@/components/new-releases/RequestModal';
import { NotifySection } from '@/components/new-releases/NotifySection';
import { ProductGridSkeleton } from '@/components/new-releases/ProductSkeleton';
import { EmptyState } from '@/components/new-releases/EmptyState';
import { ComingSoonTeaser } from '@/components/new-releases/ComingSoonTeaser';
import { FilterBar } from '@/components/new-releases/FilterBar';
import { mockProducts, Product } from '@/data/mockProducts';

type Park = 'all' | 'disney' | 'universal' | 'seaworld';
type Category = 'all' | 'loungefly' | 'spirit-jerseys' | 'popcorn-buckets' | 'ears' | 'pins' | 'limited-edition';
type SortOption = 'newest' | 'price-low' | 'price-high';

export default function NewReleasesPage() {
  const [selectedPark, setSelectedPark] = useState<Park>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest');
  const [isSticky, setIsSticky] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Simulate loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Filter and sort products
  const filteredProducts = mockProducts
    .filter((product) => {
      if (selectedPark !== 'all' && product.park !== selectedPark) return false;
      if (selectedCategory === 'limited-edition') return product.is_limited_edition;
      if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => {
      switch (selectedSort) {
        case 'newest':
          return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
        case 'price-low':
          return (a.price_estimate || 0) - (b.price_estimate || 0);
        case 'price-high':
          return (b.price_estimate || 0) - (a.price_estimate || 0);
        default:
          return 0;
      }
    });

  const handleRequestClick = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSelectedPark('all');
    setSelectedCategory('all');
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
        {/* Background Gradient */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, hsl(252, 45%, 15%) 0%, hsl(260, 40%, 20%) 50%, hsl(var(--background)) 100%)'
          }}
        />
        
        {/* Sparkle Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-gold"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeInOut',
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              <Sparkles className="w-4 h-4" />
            </motion.div>
          ))}
        </div>
        
        <div className="container-wide relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sparkle">
              Fresh From The Parks
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
              The latest merchandise drops from Disney, Universal & SeaWorld – updated daily
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Filter Bar */}
      <FilterBar
        selectedPark={selectedPark}
        setSelectedPark={setSelectedPark}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedSort={selectedSort}
        setSelectedSort={setSelectedSort}
        isSticky={isSticky}
      />
      
      {/* Product Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          {/* Coming Soon Teaser */}
          <ComingSoonTeaser />
          
          {isLoading ? (
            <ProductGridSkeleton count={8} />
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard 
                    product={product} 
                    onRequestClick={handleRequestClick}
                  />
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState onClearFilters={clearFilters} />
          )}
        </div>
      </section>

      {/* Notify Section */}
      <NotifySection />

      {/* Request Modal */}
      <RequestModal
        product={selectedProduct}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </main>
  );
}
