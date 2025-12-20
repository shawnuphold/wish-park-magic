import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/SectionHeading';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  MessageCircle,
  Search,
  ShoppingCart,
  Camera,
  CreditCard,
  Package,
  Clock,
  Lightbulb,
  CalendarDays,
} from 'lucide-react';

const steps = [
  {
    icon: MessageCircle,
    number: 1,
    title: 'Submit Your Request',
    description:
      'Send us a message via Facebook Messenger or our contact form with the items you\'re looking for. Include photos, links, or detailed descriptions.',
    tips: ['Include photos from Disney\'s shop or fan sites', 'Specify size, color, and any variations', 'Let us know if it\'s time-sensitive'],
  },
  {
    icon: Search,
    number: 2,
    title: 'We Confirm Availability',
    description:
      'We\'ll check our knowledge of current inventory and let you know if the items are likely in stock. We can\'t guarantee availability until we visit.',
    tips: ['We\'ll share what we know about stock', 'Some items rotate frequently', 'We\'ll suggest alternatives if needed'],
  },
  {
    icon: ShoppingCart,
    number: 3,
    title: 'We Shop on Our Next Trip',
    description:
      'We visit the parks multiple times per week. Your items will be purchased on our next scheduled trip to the relevant park.',
    tips: ['Typical turnaround is 1-2 weeks', 'Rush orders may be available', 'We\'ll update you throughout'],
  },
  {
    icon: Camera,
    number: 4,
    title: 'Photos & Invoice Sent',
    description:
      'Once we have your items, we\'ll send photos showing exactly what we found and a PayPal invoice with the complete breakdown.',
    tips: ['Review photos before paying', 'Ask questions if needed', 'Invoice includes all costs'],
  },
  {
    icon: CreditCard,
    number: 5,
    title: 'Payment via PayPal',
    description:
      'Pay your invoice through PayPal (credit card accepted). We also accept Venmo and Zelle for your convenience.',
    tips: ['PayPal buyer protection', 'Pay when you\'re ready', 'No pressure to rush'],
  },
  {
    icon: Package,
    number: 6,
    title: 'Shipped Within 48 Hours',
    description:
      'Once payment is received, we ship your items within 48 hours with tracking. Items are carefully packaged to arrive safely.',
    tips: ['Tracking number provided', 'Insurance included on valuable items', 'Signature required option available'],
  },
];

export default function HowItWorksPage() {
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
              How It Works
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Getting your favorite theme park merchandise is easy. Here's our 
              simple step-by-step process.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <div className="space-y-12">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="relative"
              >
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-8 top-20 bottom-0 w-0.5 bg-border hidden md:block" />
                )}
                
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-gold flex items-center justify-center shadow-gold">
                      <step.icon className="w-8 h-8 text-midnight" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 bg-card rounded-2xl p-6 shadow-card border border-border/50">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-sm font-semibold text-gold">Step {step.number}</span>
                    </div>
                    <h3 className="font-heading text-xl md:text-2xl font-semibold text-foreground mb-3">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    
                    {/* Tips */}
                    <div className="bg-secondary rounded-xl p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                        <Lightbulb className="w-4 h-4 text-gold" />
                        Tips
                      </div>
                      <ul className="space-y-1">
                        {step.tips.map((tip, j) => (
                          <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-gold">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Shopping Schedule */}
      <section className="section-padding bg-secondary">
        <div className="container-tight">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 md:p-12 shadow-card text-center"
          >
            <CalendarDays className="w-16 h-16 text-gold mx-auto mb-6" />
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Our Shopping Schedule
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-6">
              We visit the parks multiple times per week, typically covering:
            </p>
            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="bg-secondary rounded-xl p-4">
                <h4 className="font-semibold text-foreground">Disney World</h4>
                <p className="text-sm text-muted-foreground">2-3x per week</p>
              </div>
              <div className="bg-secondary rounded-xl p-4">
                <h4 className="font-semibold text-foreground">Universal</h4>
                <p className="text-sm text-muted-foreground">1-2x per week</p>
              </div>
              <div className="bg-secondary rounded-xl p-4">
                <h4 className="font-semibold text-foreground">SeaWorld</h4>
                <p className="text-sm text-muted-foreground">Weekly</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <SectionHeading
            title="Expected Timeline"
            subtitle="From request to delivery, here's what to expect."
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 shadow-card"
          >
            <div className="flex items-center justify-center gap-2 mb-8">
              <Clock className="w-6 h-6 text-gold" />
              <span className="font-heading text-xl font-semibold text-foreground">
                Typical Total: 1-3 Weeks
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-32 text-right text-sm text-muted-foreground">Day 1</div>
                <div className="w-4 h-4 rounded-full bg-gold" />
                <div className="flex-1 text-foreground">Request submitted</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 text-right text-sm text-muted-foreground">Day 1-2</div>
                <div className="w-4 h-4 rounded-full bg-gold/70" />
                <div className="flex-1 text-foreground">Availability confirmed</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 text-right text-sm text-muted-foreground">Day 3-10</div>
                <div className="w-4 h-4 rounded-full bg-gold/50" />
                <div className="flex-1 text-foreground">Item purchased at park</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 text-right text-sm text-muted-foreground">Day 10-12</div>
                <div className="w-4 h-4 rounded-full bg-gold/40" />
                <div className="flex-1 text-foreground">Photos & invoice sent</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 text-right text-sm text-muted-foreground">Day 12-14</div>
                <div className="w-4 h-4 rounded-full bg-gold/30" />
                <div className="flex-1 text-foreground">Payment received</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-32 text-right text-sm text-muted-foreground">Day 14-21</div>
                <div className="w-4 h-4 rounded-full bg-gold" />
                <div className="flex-1 text-foreground">Delivered to your door!</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding bg-magic">
        <div className="container-tight text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Ready to Start?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Send us your wishlist and let us bring the magic to you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="hero" size="lg" asChild>
                <a href="https://m.me/" target="_blank" rel="noopener noreferrer">
                  Start a Request
                </a>
              </Button>
              <Button variant="hero-outline" size="lg" asChild>
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
