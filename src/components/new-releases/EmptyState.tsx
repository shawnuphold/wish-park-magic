import { motion } from 'framer-motion';
import { Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onClearFilters: () => void;
}

export function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      {/* Illustration */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-24 h-24 mx-auto bg-muted rounded-xl flex items-center justify-center"
        >
          <Package className="w-12 h-12 text-muted-foreground" />
        </motion.div>
        
        {/* Sparkles */}
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-gold"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: [0, 1, 0],
              scale: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.3,
            }}
            style={{
              top: `${10 + Math.random() * 20}%`,
              left: `${10 + i * 25}%`,
            }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        ))}
      </div>
      
      <h3 className="font-heading text-xl font-bold text-foreground mb-2">
        No items found for this filter
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Try a different category or check back soon! We update our inventory daily with the latest park merchandise.
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear Filters
      </Button>
    </motion.div>
  );
}
