import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/SectionHeading';
import { CategoryCard } from '@/components/CategoryCard';
import { ParkBadge } from '@/components/ParkBadge';
import {
  ShoppingBag,
  Headphones,
  Shirt,
  Package,
  Star,
  Gift,
  Coffee,
  Baby,
  Home,
  Utensils,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const categories = [
  { icon: ShoppingBag, name: 'Loungefly Bags' },
  { icon: Headphones, name: 'Ears & Headbands' },
  { icon: Shirt, name: 'Spirit Jerseys' },
  { icon: Package, name: 'Popcorn Buckets' },
  { icon: Star, name: 'Pins & Trading' },
  { icon: Gift, name: 'Plush & Toys' },
  { icon: Shirt, name: 'Apparel' },
  { icon: Coffee, name: 'Drinkware' },
  { icon: Baby, name: 'Baby & Kids' },
  { icon: Home, name: 'Home Decor' },
  { icon: Utensils, name: 'Kitchen & Dining' },
  { icon: Sparkles, name: 'Collectibles' },
];

const disneyLocations = [
  'Magic Kingdom',
  'EPCOT',
  'Hollywood Studios',
  'Animal Kingdom',
  'Disney Springs',
];

const universalLocations = [
  'Universal Studios Florida',
  'Islands of Adventure',
  'CityWalk',
];

const seaworldLocations = ['SeaWorld Orlando', 'Aquatica'];

const resortHotels = [
  "Disney's Grand Floridian Resort",
  "Disney's Contemporary Resort",
  "Disney's Polynesian Village",
  "Disney's Wilderness Lodge",
  "Disney's Beach Club Resort",
  "Disney's Yacht Club Resort",
  "Disney's BoardWalk Inn",
  "Disney's Animal Kingdom Lodge",
  "Disney's Riviera Resort",
];

export default function ServicesPage() {
  return (
    <main className="pt-20">
      {/* Hero */}
      <section className="bg-magic py-20">
        <div className="container-wide text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4">
              Parks We Shop
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              We cover all three major Orlando theme parks plus Disney resort hotels — 
              the most comprehensive shopping service available.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Disney Section */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <ParkBadge park="disney" size="lg" className="mb-4" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Walt Disney World
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              From the iconic shops on Main Street to exclusive resort merchandise, 
              we cover every corner of the Most Magical Place on Earth.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {disneyLocations.map((location, i) => (
              <motion.div
                key={location}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-secondary rounded-xl p-4 text-center"
              >
                <span className="font-medium text-foreground">{location}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Universal Section */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <ParkBadge park="universal" size="lg" className="mb-4" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Universal Orlando Resort
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Wizarding World wands, Marvel gear, Nintendo collectibles — we shop 
              the entire Universal Orlando experience.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
            {universalLocations.map((location, i) => (
              <motion.div
                key={location}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-4 text-center shadow-soft"
              >
                <span className="font-medium text-foreground">{location}</span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              viewport={{ once: true }}
              className="bg-card rounded-xl p-4 text-center shadow-soft relative overflow-hidden"
            >
              <span className="absolute top-2 right-2 bg-gold text-midnight text-xs px-2 py-0.5 rounded-full font-semibold">
                Coming Soon
              </span>
              <span className="font-medium text-foreground">Epic Universe</span>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SeaWorld Section */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <ParkBadge park="seaworld" size="lg" className="mb-4" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              SeaWorld Orlando
            </h2>
            <p className="text-muted-foreground max-w-2xl">
              Unique ocean-themed merchandise and exclusive SeaWorld collectibles 
              that you won't find anywhere else.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md">
            {seaworldLocations.map((location, i) => (
              <motion.div
                key={location}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="bg-secondary rounded-xl p-4 text-center"
              >
                <span className="font-medium text-foreground">{location}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Resort Hotels */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <SectionHeading
            title="Resort Hotels We Visit"
            subtitle="Exclusive merchandise only available at Disney resort hotels."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {resortHotels.map((hotel, i) => (
              <motion.div
                key={hotel}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
                viewport={{ once: true }}
                className="bg-card rounded-xl p-4 shadow-soft"
              >
                <span className="font-medium text-foreground">{hotel}</span>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              viewport={{ once: true }}
              className="bg-card rounded-xl p-4 shadow-soft text-muted-foreground"
            >
              And more resorts upon request...
            </motion.div>
          </div>
        </div>
      </section>

      {/* What We Can Get */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <SectionHeading
            title="What We Can Get"
            subtitle="From everyday souvenirs to rare collectibles, we shop it all."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((cat, i) => (
              <CategoryCard key={cat.name} {...cat} delay={i * 0.03} />
            ))}
          </div>
        </div>
      </section>

      {/* Limitations */}
      <section className="section-padding bg-secondary">
        <div className="container-tight">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 border border-border shadow-soft"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                  Items We Cannot Ship
                </h3>
                <p className="text-muted-foreground">
                  Due to shipping restrictions, we cannot ship alcohol, food items requiring 
                  refrigeration, or certain hazardous materials. If you're unsure about an item, 
                  just ask!
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
