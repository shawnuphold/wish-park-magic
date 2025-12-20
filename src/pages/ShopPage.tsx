import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ParkBadge } from '@/components/ParkBadge';
import { useCart, CartItem } from '@/hooks/useCart';
import { toast } from 'sonner';
import { ShoppingCart, X, Plus, Minus, Filter } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Sample products data
const products: Omit<CartItem, 'quantity'>[] = [
  {
    id: '1',
    name: 'Mickey Mouse Spirit Jersey - Coral',
    price: 59.99,
    image: 'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=400&h=400&fit=crop',
    park: 'disney',
  },
  {
    id: '2',
    name: 'Haunted Mansion Loungefly Backpack',
    price: 85.00,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    park: 'disney',
  },
  {
    id: '3',
    name: 'Butterbeer Mug',
    price: 18.99,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=400&fit=crop',
    park: 'universal',
  },
  {
    id: '4',
    name: 'EPCOT Festival Ears',
    price: 34.99,
    image: 'https://images.unsplash.com/photo-1609372332255-611485350f25?w=400&h=400&fit=crop',
    park: 'disney',
  },
  {
    id: '5',
    name: 'Hogwarts Castle Pin Set',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&h=400&fit=crop',
    park: 'universal',
  },
  {
    id: '6',
    name: 'Orca Plush - Large',
    price: 32.99,
    image: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=400&h=400&fit=crop',
    park: 'seaworld',
  },
  {
    id: '7',
    name: 'Star Wars Galaxy Edge Mug',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=400&h=400&fit=crop',
    park: 'disney',
  },
  {
    id: '8',
    name: 'Jurassic World Raptor Figurine',
    price: 45.00,
    image: 'https://images.unsplash.com/photo-1619468129361-605ebea04b44?w=400&h=400&fit=crop',
    park: 'universal',
  },
];

export default function ShopPage() {
  const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCart();
  const [parkFilter, setParkFilter] = useState<string>('all');
  const [cartOpen, setCartOpen] = useState(false);
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = products.filter(
    (product) => parkFilter === 'all' || product.park === parkFilter
  );

  const handleAddToCart = (product: Omit<CartItem, 'quantity'>) => {
    addItem(product);
    toast.success(`${product.name} added to cart!`);
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
              Shop Unclaimed Items
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Items from cancelled orders at discounted prices. All sales final.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Shop Content */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
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

            {/* Cart Button */}
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="gold" className="relative">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  View Cart
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-midnight text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle className="font-heading">Your Cart</SheetTitle>
                </SheetHeader>
                
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <ShoppingCart className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Your cart is empty</p>
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col h-[calc(100vh-200px)]">
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-4 p-4 bg-secondary rounded-xl"
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground text-sm">
                              {item.name}
                            </h4>
                            <p className="text-gold font-semibold">
                              ${item.price.toFixed(2)}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-7 h-7 rounded-full bg-card flex items-center justify-center hover:bg-muted transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-7 h-7 rounded-full bg-card flex items-center justify-center hover:bg-muted transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t border-border pt-4 mt-4 space-y-4">
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Subtotal</span>
                        <span className="text-gold">${total.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Taxes and shipping calculated at checkout
                      </p>
                      <Button variant="gold" className="w-full" size="lg">
                        Proceed to Checkout
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={clearCart}
                      >
                        Clear Cart
                      </Button>
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>

          {/* Product Grid */}
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
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3">
                    <ParkBadge park={product.park} size="sm" />
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-foreground mb-2 line-clamp-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gold">
                      ${product.price.toFixed(2)}
                    </span>
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => handleAddToCart(product)}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                No products found for this filter.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
