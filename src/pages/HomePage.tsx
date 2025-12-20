import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SectionHeading } from '@/components/SectionHeading';
import { FeatureCard } from '@/components/FeatureCard';
import { StepCard } from '@/components/StepCard';
import { TestimonialCard } from '@/components/TestimonialCard';
import { CategoryCard } from '@/components/CategoryCard';
import { ParkBadgeGroup } from '@/components/ParkBadge';
import { Input } from '@/components/ui/input';
import { 
  Castle, 
  MapPin, 
  DollarSign, 
  Heart, 
  Sparkles,
  ShoppingBag,
  Headphones,
  Shirt,
  Package,
  Star,
  Coffee,
  Gift,
  Users,
  Facebook
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// Park images
import castleFireworks from '@/assets/parks/castle-fireworks.jpg';
import epcotSphere from '@/assets/parks/epcot-sphere.jpg';
import wizardCastle from '@/assets/parks/wizard-castle.jpg';
import rollerCoaster from '@/assets/parks/roller-coaster.jpg';
import mainStreet from '@/assets/parks/main-street.jpg';
import waterPark from '@/assets/parks/water-park.jpg';

// Park gallery data
const parkGallery = [
  { image: castleFireworks, title: 'Magic Kingdom', park: 'Disney World', span: 'col-span-2 row-span-2' },
  { image: epcotSphere, title: 'EPCOT', park: 'Disney World', span: '' },
  { image: wizardCastle, title: 'Wizarding World', park: 'Universal', span: '' },
  { image: rollerCoaster, title: 'Thrilling Rides', park: 'SeaWorld', span: '' },
  { image: mainStreet, title: 'Main Street Shopping', park: 'Disney World', span: '' },
  { image: waterPark, title: 'Aquatica', park: 'SeaWorld', span: '' },
];

// Steps data
const steps = [
  { number: 1, title: 'Request', description: 'Send us your wishlist via Facebook Messenger with photos and details.' },
  { number: 2, title: 'We Shop', description: 'We visit the parks and hunt down your items on our next trip.' },
  { number: 3, title: 'Invoice', description: 'Receive photos of your items and a PayPal invoice for review.' },
  { number: 4, title: 'Delivered', description: 'Pay and we ship within 48 hours to your doorstep.' },
];

// Features data
const features = [
  {
    icon: Castle,
    title: 'All Three Parks',
    description: 'The only service covering Disney World, Universal Orlando, AND SeaWorld in one place.',
  },
  {
    icon: MapPin,
    title: 'Resort Hotels',
    description: 'Access to exclusive merchandise at Disney resort hotels most shoppers can\'t reach.',
  },
  {
    icon: DollarSign,
    title: 'Simple Pricing',
    description: '$6 flat pickup fee or 10% for specialty items. No hidden fees, ever.',
  },
  {
    icon: Heart,
    title: 'Family Owned',
    description: 'Personal service from a local Orlando family who loves the parks as much as you do.',
  },
];

// Categories data
const categories = [
  { icon: ShoppingBag, name: 'Loungefly Bags' },
  { icon: Headphones, name: 'Ears & Headbands' },
  { icon: Shirt, name: 'Spirit Jerseys' },
  { icon: Package, name: 'Popcorn Buckets' },
  { icon: Star, name: 'Pins' },
  { icon: Gift, name: 'Plush' },
  { icon: Shirt, name: 'Apparel' },
  { icon: Coffee, name: 'Drinkware' },
];

// Testimonials data
const testimonials = [
  {
    quote: "Absolutely amazing service! They found a sold-out Loungefly that I'd been searching for months. Shipped fast and packed perfectly.",
    author: "Sarah M.",
    location: "California",
  },
  {
    quote: "As someone who can't travel to Orlando, this service is a lifesaver. Fair prices and the communication is fantastic.",
    author: "Mike R.",
    location: "New York",
  },
  {
    quote: "They got me exclusive resort merchandise that you can't find anywhere else online. Worth every penny!",
    author: "Jennifer L.",
    location: "Texas",
  },
];

export default function HomePage() {
  const [email, setEmail] = useState('');

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success('Thanks for subscribing! Magic is on its way.');
      setEmail('');
    }
  };

  return (
    <main>
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-magic" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gold/10 via-transparent to-transparent" />
        
        {/* Sparkles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-gold/30 text-lg"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.3,
              }}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              ✦
            </motion.div>
          ))}
        </div>

        <div className="container-wide relative z-10 pt-20">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 bg-gold/20 text-gold px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Your Orlando Theme Park Personal Shoppers
              </div>
              
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-primary-foreground mb-6 leading-tight">
                Your Personal Shoppers for{' '}
                <span className="text-gradient">Disney, Universal & SeaWorld</span>
              </h1>
              
              <p className="text-lg md:text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
                We shop the parks so you don't have to. All three Orlando parks, resort hotels, 
                and more — delivered to your door.
              </p>
              
              <ParkBadgeGroup className="mb-10" />
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button variant="hero" size="xl" asChild>
                  <a href="https://m.me/" target="_blank" rel="noopener noreferrer">
                    Start a Request
                  </a>
                </Button>
                <Button variant="hero-outline" size="xl" asChild>
                  <Link to="/shop">Shop Unclaimed Items</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-2">
            <div className="w-1.5 h-3 rounded-full bg-gold" />
          </div>
        </motion.div>
      </section>

      {/* Park Gallery */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <SectionHeading 
            title="Parks We Visit" 
            subtitle="We shop at all three major Orlando theme park resorts so you can get merchandise from anywhere."
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[200px] md:auto-rows-[250px]">
            {parkGallery.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative rounded-2xl overflow-hidden group cursor-pointer ${item.span}`}
              >
                <img 
                  src={item.image} 
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                  <span className="text-gold text-xs font-medium uppercase tracking-wider">{item.park}</span>
                  <h3 className="font-heading text-lg md:text-xl font-bold text-primary-foreground">{item.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <SectionHeading 
            title="How It Works" 
            subtitle="Getting your favorite park merchandise is easy with our simple 4-step process."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <StepCard key={step.number} {...step} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* What We Shop */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <SectionHeading 
            title="What We Shop" 
            subtitle="From exclusive Loungefly bags to limited edition popcorn buckets, we've got you covered."
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {categories.map((cat, i) => (
              <CategoryCard key={cat.name} {...cat} delay={i * 0.05} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <SectionHeading 
            title="Why Choose Us" 
            subtitle="We're not just shoppers — we're fellow fans who understand the magic."
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <SectionHeading 
            title="What Our Customers Say" 
            subtitle="Join thousands of happy customers who got their magical merchandise."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, i) => (
              <TestimonialCard key={testimonial.author} {...testimonial} delay={i * 0.1} />
            ))}
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="section-padding bg-magic">
        <div className="container-tight text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Users className="w-16 h-16 text-gold mx-auto mb-6" />
            <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
              Join Our Community
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Connect with fellow park fans, get updates on restocks, and see our latest finds.
            </p>
            <Button variant="hero" size="lg" asChild>
              <a href="#" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                <Facebook className="w-5 h-5" />
                Join Our Facebook Group
              </a>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="bg-card rounded-3xl p-8 md:p-12 shadow-elevated border border-border/50 text-center"
          >
            <Sparkles className="w-12 h-12 text-gold mx-auto mb-6" />
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Stay in the Magic
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Subscribe to get notified about exclusive finds, restocks, and special deals.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
                required
              />
              <Button type="submit" variant="gold">
                Subscribe
              </Button>
            </form>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
