"use client";

import { cn } from '@/lib/utils';

export type FilterStatus = 'all' | 'pending' | 'found' | 'not_found';

interface FilterTabsProps {
  currentFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
  counts: {
    all: number;
    pending: number;
    found: number;
    not_found: number;
  };
}

const filters: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'found', label: 'Found' },
  { value: 'not_found', label: 'Not Found' },
];

export function FilterTabs({ currentFilter, onFilterChange, counts }: FilterTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      {filters.map((filter) => {
        const count = counts[filter.value];
        const isActive = currentFilter === filter.value;

        return (
          <button
            key={filter.value}
            onClick={() => onFilterChange(filter.value)}
            className={cn(
              "flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
              isActive
                ? "bg-gold text-midnight"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {filter.label}
            <span className={cn(
              "ml-1.5",
              isActive ? "opacity-100" : "opacity-70"
            )}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
