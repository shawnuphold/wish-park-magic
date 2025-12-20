import { Star, Quote } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface TestimonialCardProps {
  quote: string;
  author: string;
  location?: string;
  rating?: number;
  className?: string;
  delay?: number;
}

export function TestimonialCard({ 
  quote, 
  author, 
  location, 
  rating = 5, 
  className, 
  delay = 0 
}: TestimonialCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className={cn(
        'relative bg-card rounded-2xl p-6 shadow-card border border-border/50',
        className
      )}
    >
      <Quote className="w-10 h-10 text-gold/30 mb-4" />
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="w-4 h-4 fill-gold text-gold" />
        ))}
      </div>
      <p className="text-foreground leading-relaxed mb-4">{quote}</p>
      <div>
        <p className="font-semibold text-foreground">{author}</p>
        {location && <p className="text-sm text-muted-foreground">{location}</p>}
      </div>
    </motion.div>
  );
}
