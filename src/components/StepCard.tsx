import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StepCardProps {
  number: number;
  title: string;
  description: string;
  className?: string;
  delay?: number;
}

export function StepCard({ number, title, description, className, delay = 0 }: StepCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      className={cn(
        'relative flex flex-col items-center text-center p-6',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-gold flex items-center justify-center mb-4 shadow-gold">
        <span className="font-heading text-2xl font-bold text-midnight">{number}</span>
      </div>
      <h3 className="font-heading text-xl font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
