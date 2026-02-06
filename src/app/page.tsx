'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Castle,
  MapPin,
  DollarSign,
  Heart,
  ShoppingBag,
  Star,
  Package,
  ArrowRight,
} from 'lucide-react';

const parkCards = [
  {
    name: 'Disney World',
    image: '/images/parks/castle-fireworks.jpg',
    description: 'Magic Kingdom, EPCOT, Hollywood Studios & Animal Kingdom',
    href: '/request?park=disney',
  },
  {
    name: 'Universal Orlando',
    image: '/images/parks/wizard-castle.jpg',
    description: 'Universal Studios, Islands of Adventure & CityWalk',
    href: '/request?park=universal',
  },
  {
    name: 'SeaWorld',
    image: '/images/parks/seaworld-shopping.jpg',
    description: 'SeaWorld Orlando, Aquatica & Discovery Cove',
    href: '/request?park=seaworld',
  },
];

const features = [
  {
    icon: Castle,
    title: 'All Three Parks',
    description:
      'The only service covering Disney World, Universal Orlando, AND SeaWorld in one place.',
  },
  {
    icon: MapPin,
    title: 'Resort Hotels',
    description:
      "Access to exclusive merchandise at Disney resort hotels most shoppers can't reach.",
  },
  {
    icon: DollarSign,
    title: 'Simple Pricing',
    description: '$6 flat pickup fee or 10% for specialty items. No hidden fees, ever.',
  },
  {
    icon: Heart,
    title: 'Family Owned',
    description:
      'Personal service from a local Orlando family who loves the parks as much as you do.',
  },
];

const steps = [
  { number: 1, title: 'Request', description: 'Send us your wishlist with photos and details.' },
  {
    number: 2,
    title: 'We Shop',
    description: 'We visit the parks and hunt down your items on our next trip.',
  },
  { number: 3, title: 'Invoice', description: 'Receive photos of your items and a PayPal invoice.' },
  { number: 4, title: 'Delivered', description: 'Pay and we ship within 48 hours to your doorstep.' },
];

export default function HomePage() {
  return (
    <main className="pt-20">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-bg.jpg"
            alt="Theme park magic"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-midnight/80 via-midnight/70 to-midnight/90" />
        </div>

        <div className="container-wide relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Theme Park Shopping,{' '}
                <span className="text-gold">Made Magical</span>
              </h1>
              <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Can&apos;t make it to the parks? We&apos;ll do your shopping for you! Disney World,
                Universal Orlando, and SeaWorld merchandise delivered to your door.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold/90 text-[hsl(222,50%,17%)]"
                  asChild
                >
                  <Link href="/request">
                    Start Your Request
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/new-releases">See New Releases</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Park Cards Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Shop From Your Favorite Parks
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We cover all the major Orlando theme parks. Select your destination to get started.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {parkCards.map((park, i) => (
              <motion.div
                key={park.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <Link href={park.href} className="block group">
                  <div className="relative rounded-2xl overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                    <div className="aspect-[4/3] relative">
                      <Image
                        src={park.image}
                        alt={park.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="font-heading text-2xl font-bold mb-2">{park.name}</h3>
                      <p className="text-white/80 text-sm">{park.description}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Us?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We&apos;re not just shoppers - we&apos;re park enthusiasts who treat every order like
              our own.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-6 shadow-card border border-border/50"
              >
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Getting your dream merchandise is as easy as 1-2-3-4.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-gold text-[hsl(222,50%,17%)] flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  {step.number}
                </div>
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-magic">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Start Shopping?
              </h2>
              <p className="text-white/80 mb-8">
                Send us your wishlist and let us bring the magic to your doorstep.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-gold hover:bg-gold/90 text-[hsl(222,50%,17%)]"
                  asChild
                >
                  <Link href="/request">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Start a Request
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/portal">Client Portal</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
