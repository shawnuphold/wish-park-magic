import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Filter, X, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Park types
type Park = 'all' | 'disney' | 'universal' | 'seaworld';
type Category = 'all' | 'loungefly' | 'spirit-jerseys' | 'popcorn-buckets' | 'ears' | 'pins' | 'limited-edition';
type SortOption = 'newest' | 'price-low' | 'price-high';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  park: 'disney' | 'universal' | 'seaworld';
  category: Category;
  isNew: boolean;
  isLimited: boolean;
  source: string;
  sourceUrl: string;
  dateAdded: Date;
}

// Mock data for demonstration
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Haunted Mansion Loungefly Mini Backpack',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    park: 'disney',
    category: 'loungefly',
    isNew: true,
    isLimited: false,
    source: 'BlogMickey',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '2',
    name: 'Figment Popcorn Bucket - EPCOT Festival',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400&h=400&fit=crop',
    park: 'disney',
    category: 'popcorn-buckets',
    isNew: true,
    isLimited: true,
    source: 'WDW News Today',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '3',
    name: 'Universal Studios Horror Nights Spirit Jersey',
    price: 74.99,
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&h=400&fit=crop',
    park: 'universal',
    category: 'spirit-jerseys',
    isNew: true,
    isLimited: false,
    source: 'Orlando United',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    name: 'Mickey Mouse 50th Anniversary Ears',
    price: 39.99,
    image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop',
    park: 'disney',
    category: 'ears',
    isNew: false,
    isLimited: true,
    source: 'BlogMickey',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: '5',
    name: 'SeaWorld Orca Encounter Pin Set',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=400&fit=crop',
    park: 'seaworld',
    category: 'pins',
    isNew: true,
    isLimited: false,
    source: 'Theme Park Insider',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '6',
    name: 'Jurassic World Limited Edition Backpack',
    price: 95.00,
    image: 'https://images.unsplash.com/photo-1547949003-9792a18a2601?w=400&h=400&fit=crop',
    park: 'universal',
    category: 'loungefly',
    isNew: false,
    isLimited: true,
    source: 'Orlando ParkStop',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
  },
  {
    id: '7',
    name: 'Main Street USA Retro Spirit Jersey',
    price: 69.99,
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop',
    park: 'disney',
    category: 'spirit-jerseys',
    isNew: true,
    isLimited: false,
    source: 'Chip and Co',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: '8',
    name: 'Butterbeer Popcorn Bucket',
    price: 35.00,
    image: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400&h=400&fit=crop',
    park: 'universal',
    category: 'popcorn-buckets',
    isNew: true,
    isLimited: true,
    source: 'Universal Parks Blog',
    sourceUrl: '#',
    dateAdded: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const parkFilters = [
  { value: 'all' as Park, label: 'All Parks' },
  { value: 'disney' as Park, label: 'Disney' },
  { value: 'universal' as Park, label: 'Universal' },
  { value: 'seaworld' as Park, label: 'SeaWorld' },
];

const categoryFilters = [
  { value: 'all' as Category, label: 'All' },
  { value: 'loungefly' as Category, label: 'Loungefly' },
  { value: 'spirit-jerseys' as Category, label: 'Spirit Jerseys' },
  { value: 'popcorn-buckets' as Category, label: 'Popcorn Buckets' },
  { value: 'ears' as Category, label: 'Ears' },
  { value: 'pins' as Category, label: 'Pins' },
  { value: 'limited-edition' as Category, label: 'Limited Edition' },
];

const sortOptions = [
  { value: 'newest' as SortOption, label: 'Newest' },
  { value: 'price-low' as SortOption, label: 'Price: Low to High' },
  { value: 'price-high' as SortOption, label: 'Price: High to Low' },
];

function ParkIcon({ park }: { park: 'disney' | 'universal' | 'seaworld' }) {
  if (park === 'disney') {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="6" />
        <circle cx="4" cy="6" r="4" />
        <circle cx="20" cy="6" r="4" />
      </svg>
    );
  }
  if (park === 'universal') {
    return (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 4c1 2 2 4 0 6s-4 1-4-1 3-7 4-5zm0 10c-1-2-2-4 0-6s4-1 4 1-3 7-4 5z" />
    </svg>
  );
}

function ProductCard({ product }: { product: Product }) {
  const daysSinceAdded = Math.floor((Date.now() - product.dateAdded.getTime()) / (1000 * 60 * 60 * 24));
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300"
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.isNew && daysSinceAdded < 3 && (
            <Badge className="bg-gold text-midnight font-bold px-2 py-1 text-xs">
              NEW
            </Badge>
          )}
          {product.isLimited && (
            <Badge className="bg-destructive text-destructive-foreground font-bold px-2 py-1 text-xs">
              LIMITED
            </Badge>
          )}
        </div>
        
        {/* Park Icon */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center text-foreground">
          <ParkIcon park={product.park} />
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-foreground line-clamp-2 mb-2 min-h-[3rem]">
          {product.name}
        </h3>
        
        <p className="text-lg font-bold text-gold mb-2">
          ~${product.price.toFixed(2)}
        </p>
        
        <a
          href={product.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          via {product.source}
          <ExternalLink className="w-3 h-3" />
        </a>
        
        <Button variant="gold" className="w-full" asChild>
          <a href="https://m.me/" target="_blank" rel="noopener noreferrer">
            Request This Item
          </a>
        </Button>
      </div>
    </motion.div>
  );
}

function FilterBar({
  selectedPark,
  setSelectedPark,
  selectedCategory,
  setSelectedCategory,
  selectedSort,
  setSelectedSort,
  isSticky,
}: {
  selectedPark: Park;
  setSelectedPark: (park: Park) => void;
  selectedCategory: Category;
  setSelectedCategory: (category: Category) => void;
  selectedSort: SortOption;
  setSelectedSort: (sort: SortOption) => void;
  isSticky: boolean;
}) {
  return (
    <div
      className={cn(
        'py-4 transition-all duration-300 z-40',
        isSticky && 'sticky top-20 bg-background/95 backdrop-blur-md shadow-soft'
      )}
    >
      <div className="container-wide">
        {/* Desktop Filters */}
        <div className="hidden md:flex flex-wrap items-center gap-6">
          {/* Park Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Park:</span>
            <div className="flex gap-1">
              {parkFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedPark(filter.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    selectedPark === filter.value
                      ? 'bg-gold text-midnight'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Category:</span>
            <div className="flex flex-wrap gap-1">
              {categoryFilters.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setSelectedCategory(filter.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    selectedCategory === filter.value
                      ? 'bg-gold text-midnight'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm font-medium text-muted-foreground">Sort:</span>
            <div className="flex gap-1">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedSort(option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    selectedSort === option.value
                      ? 'bg-gold text-midnight'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Mobile Filter Button */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Filter className="w-4 h-4" />
                Filters & Sort
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
              <SheetHeader>
                <SheetTitle>Filters & Sort</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                {/* Park Filter */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Park</h4>
                  <div className="flex flex-wrap gap-2">
                    {parkFilters.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setSelectedPark(filter.value)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          selectedPark === filter.value
                            ? 'bg-gold text-midnight'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Category Filter */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Category</h4>
                  <div className="flex flex-wrap gap-2">
                    {categoryFilters.map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setSelectedCategory(filter.value)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          selectedCategory === filter.value
                            ? 'bg-gold text-midnight'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Sort */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Sort By</h4>
                  <div className="flex flex-wrap gap-2">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedSort(option.value)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          selectedSort === option.value
                            ? 'bg-gold text-midnight'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
}

export default function NewReleasesPage() {
  const [selectedPark, setSelectedPark] = useState<Park>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedSort, setSelectedSort] = useState<SortOption>('newest');
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Hero section is roughly 400px
      setIsSticky(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter and sort products
  const filteredProducts = mockProducts
    .filter((product) => {
      if (selectedPark !== 'all' && product.park !== selectedPark) return false;
      if (selectedCategory === 'limited-edition') return product.isLimited;
      if (selectedCategory !== 'all' && product.category !== selectedCategory) return false;
      return true;
    })
    .sort((a, b) => {
      switch (selectedSort) {
        case 'newest':
          return b.dateAdded.getTime() - a.dateAdded.getTime();
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        default:
          return 0;
      }
    });

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
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No products found matching your filters.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSelectedPark('all');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
