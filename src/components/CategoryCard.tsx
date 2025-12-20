import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
  icon: LucideIcon;
  name: string;
  className?: string;
  delay?: number;
}

export function CategoryCard({ icon: Icon, name, className, delay = 0 }: CategoryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.05 }}
      className={cn(
        'flex flex-col items-center justify-center p-4 rounded-xl bg-secondary hover:bg-gold/10 transition-colors cursor-default',
        className
      )}
    >
      <Icon className="w-8 h-8 text-gold mb-2" />
      <span className="text-sm font-medium text-foreground text-center">{name}</span>
    </motion.div>
  );
}
