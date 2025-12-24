import { motion } from 'framer-motion';
import { ExternalLink, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Product } from '@/data/mockProducts';

interface ProductCardProps {
  product: Product;
  onRequestClick: (product: Product) => void;
}

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

export function ProductCard({ product, onRequestClick }: ProductCardProps) {
  const releaseDate = new Date(product.release_date);
  const daysSinceRelease = Math.floor((Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24));
  const isNew = daysSinceRelease < 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300"
    >
      {/* Image Container */}
      <a
        href={product.source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block relative aspect-square overflow-hidden bg-muted cursor-pointer"
      >
        <img
          src={product.image_url}
          alt={`${product.title} - New merchandise at ${product.park === 'disney' ? 'Walt Disney World' : product.park === 'universal' ? 'Universal Orlando' : 'SeaWorld'}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        
        {/* Hover Overlay - Photo Credit */}
        <div className="absolute inset-0 bg-midnight/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
          <div className="flex items-center gap-2 text-white text-sm">
            <Camera className="w-4 h-4" />
            <span>Photo credit: {product.source}</span>
          </div>
        </div>
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {isNew && (
            <Badge className="bg-gold text-midnight font-bold px-2 py-1 text-xs">
              NEW
            </Badge>
          )}
          {product.is_limited_edition && (
            <Badge className="bg-destructive text-destructive-foreground font-bold px-2 py-1 text-xs">
              LIMITED
            </Badge>
          )}
        </div>
        
        {/* Park Icon */}
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center text-foreground z-10">
          <ParkIcon park={product.park} />
        </div>
      </a>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-foreground line-clamp-2 mb-2 min-h-[3rem]">
          {product.title}
        </h3>
        
        {product.price_estimate && (
          <p className="text-lg font-bold text-gold mb-2">
            ~${product.price_estimate.toFixed(2)}
          </p>
        )}
        
        {/* Source Attribution */}
        <a
          href={product.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          📷 Source: {product.source}
          <ExternalLink className="w-3 h-3" />
        </a>
        
        <Button 
          variant="gold" 
          className="w-full"
          onClick={() => onRequestClick(product)}
        >
          Request This Item
        </Button>
      </div>
    </motion.div>
  );
}
