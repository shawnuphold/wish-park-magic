import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type Park = 'all' | 'disney' | 'universal' | 'seaworld';
type Category = 'all' | 'loungefly' | 'spirit-jerseys' | 'popcorn-buckets' | 'ears' | 'pins' | 'limited-edition';
type SortOption = 'newest' | 'price-low' | 'price-high';

interface FilterBarProps {
  selectedPark: Park;
  setSelectedPark: (park: Park) => void;
  selectedCategory: Category;
  setSelectedCategory: (category: Category) => void;
  selectedSort: SortOption;
  setSelectedSort: (sort: SortOption) => void;
  isSticky: boolean;
}

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

export function FilterBar({
  selectedPark,
  setSelectedPark,
  selectedCategory,
  setSelectedCategory,
  selectedSort,
  setSelectedSort,
  isSticky,
}: FilterBarProps) {
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
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2',
                    selectedPark === filter.value
                      ? 'bg-gold text-midnight'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                  aria-pressed={selectedPark === filter.value}
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
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2',
                    selectedCategory === filter.value
                      ? 'bg-gold text-midnight'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                  aria-pressed={selectedCategory === filter.value}
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
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2',
                    selectedSort === option.value
                      ? 'bg-gold text-midnight'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  )}
                  aria-pressed={selectedSort === option.value}
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
