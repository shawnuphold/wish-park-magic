import { cn } from '@/lib/utils';

type ParkType = 'disney' | 'universal' | 'seaworld';

interface ParkBadgeProps {
  park: ParkType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const parkConfig = {
  disney: {
    name: 'Disney',
    gradient: 'from-blue-600 to-purple-600',
    icon: '🏰',
  },
  universal: {
    name: 'Universal',
    gradient: 'from-yellow-500 to-orange-500',
    icon: '🌍',
  },
  seaworld: {
    name: 'SeaWorld',
    gradient: 'from-cyan-500 to-blue-500',
    icon: '🐬',
  },
};

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base',
};

export function ParkBadge({ park, size = 'md', className }: ParkBadgeProps) {
  const config = parkConfig[park];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium text-white bg-gradient-to-r',
        config.gradient,
        sizeClasses[size],
        className
      )}
    >
      <span>{config.icon}</span>
      <span>{config.name}</span>
    </span>
  );
}

export function ParkBadgeGroup({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-3', className)}>
      <ParkBadge park="disney" size="lg" />
      <ParkBadge park="universal" size="lg" />
      <ParkBadge park="seaworld" size="lg" />
    </div>
  );
}
