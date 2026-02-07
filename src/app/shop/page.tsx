'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ParkBadge } from '@/components/ParkBadge';
import { toast } from 'sonner';
import { Filter, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BuyRequestModal } from '@/components/shop/BuyRequestModal';

interface InventoryItem {
  id: string;
  title: string;
  price: number;
  image: string;
  park: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [parkFilter, setParkFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [buyModalOpen, setBuyModalOpen] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      // Fetch from unclaimed_inventory table via API
      const response = await fetch('/api/shop/inventory', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setProducts(data.items || []);
      } else {
        setProducts([]);
      }
    } catch {
      toast.error('Failed to load inventory');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter(
    (product) => parkFilter === 'all' || product.park === parkFilter
  );

  const handleBuyRequest = (item: InventoryItem) => {
    setSelectedItem(item);
    setBuyModalOpen(true);
  };

  return (
    <main className="pt-20">
      {/* Hero */}
      <section className="bg-magic py-16">
        <div className="container-wide text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">
              Shop Inventory
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Browse available items from our inventory
            </p>
          </motion.div>
        </div>
      </section>

      {/* Shop Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          {/* Toolbar */}
          <div className="flex items-center gap-4 mb-8">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <Select value={parkFilter} onValueChange={setParkFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by park" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Parks</SelectItem>
                <SelectItem value="disney">Disney</SelectItem>
                <SelectItem value="universal">Universal</SelectItem>
                <SelectItem value="seaworld">SeaWorld</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-gold" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg mb-4">
                No products available at this time.
              </p>
              <p className="text-sm text-muted-foreground">
                Check back soon or submit a custom request for the items you're looking for!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.image || '/images/no-image-placeholder.png'}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/images/no-image-placeholder.png'; }}
                    />
                    <div className="absolute top-3 left-3">
                      <ParkBadge park={product.park as 'disney' | 'universal' | 'seaworld'} size="sm" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-gold">
                        ${product.price.toFixed(2)}
                      </span>
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-gold hover:bg-gold/90 text-midnight"
                        onClick={() => handleBuyRequest(product)}
                      >
                        Request to Buy
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <BuyRequestModal
        item={selectedItem}
        isOpen={buyModalOpen}
        onClose={() => {
          setBuyModalOpen(false);
          setSelectedItem(null);
        }}
      />
    </main>
  );
}
