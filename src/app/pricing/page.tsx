'use client';

import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/SectionHeading';
import { CheckCircle, Info, ShoppingBag, Package, Truck, CreditCard, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const pricingFaqs = [
  {
    question: 'What if you can\'t find my item?',
    answer:
      'If we can\'t find your item, you\'ll get a full refund on your deposit. No questions asked!',
  },
  {
    question: 'Why is there a processing fee?',
    answer:
      'A small processing fee (2.5%-3.5%) applies to cover credit card transaction costs. This helps us keep our shopping fees low.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept PayPal (invoices sent directly), Venmo, and Zelle for your convenience.',
  },
  {
    question: 'Is there a minimum order?',
    answer:
      'No minimum order required! Whether you want one pin or a full haul, we\'re happy to help.',
  },
  {
    question: 'Where do you shop?',
    answer:
      'We shop at Walt Disney World, Disney Springs, Disney Resort Hotels, Universal Orlando, and SeaWorld for exclusive park merchandise.',
  },
];

const howItWorks = [
  {
    icon: ShoppingBag,
    title: 'We Shop For You',
    description: 'Let us know what park-exclusive items you\'re looking for.',
  },
  {
    icon: Package,
    title: 'Hassle-Free Pickups',
    description: 'We visit the parks, resorts, and Disney Springs to grab your must-haves.',
  },
  {
    icon: Truck,
    title: 'Worldwide Shipping',
    description: 'Your magical finds delivered straight to your door!',
  },
];

export default function PricingPage() {
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
              Simple, Transparent Pricing
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              We're thrilled to have you here! Enchanted Park Pickups is your go-to personal shopping service for exclusive merchandise from Walt Disney World, Disney Springs, Disney Resort Hotels, Universal Orlando, and SeaWorld.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <SectionHeading
            title="How It Works"
            subtitle="Getting your favorite park merchandise is easy!"
          />

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-8 shadow-card border border-border/50 text-center"
              >
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <step.icon className="w-8 h-8 text-gold" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Breakdown */}
      <section className="section-padding bg-secondary">
        <div className="container-tight">
          <SectionHeading
            title="Shopping Fees"
            subtitle="Our fees are simple and straightforward."
          />

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Per Item Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card border border-border/50"
            >
              <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                Per Item
              </h3>
              <p className="text-muted-foreground mb-6">
                For orders of 1-4 items
              </p>
              <div className="text-center py-6">
                <span className="text-5xl font-bold text-gold">$6</span>
                <span className="text-muted-foreground ml-2">per item</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Perfect for small orders and single item pickups
              </p>
            </motion.div>

            {/* Unlimited Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card border border-gold/30 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-gold text-midnight text-xs px-3 py-1 rounded-full font-semibold">
                Best Value
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                Unlimited Items
              </h3>
              <p className="text-muted-foreground mb-6">
                For orders of 5 or more items
              </p>
              <div className="text-center py-6">
                <span className="text-5xl font-bold text-gold">$25</span>
                <span className="text-muted-foreground ml-2">flat rate</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Shop as many items as you want for one low price!
              </p>
            </motion.div>
          </div>

          {/* Deposit Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 shadow-card border border-border/50 mb-8"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-6 h-6 text-gold" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">
                  Deposit Information
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                    <span>The shopper fee is due upfront</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                    <span>Items over $150 require a 50% deposit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                    <span>If we can't find your item, you'll get a full refund on your deposit</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Info className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span>A small processing fee (2.5%-3.5%) applies to cover credit card transaction costs</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>

          {/* No Minimum Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 bg-gold/10 text-gold px-6 py-3 rounded-full mx-auto w-fit"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">No Minimum Order Required</span>
          </motion.div>
        </div>
      </section>

      {/* Shipping */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <SectionHeading
            title="Worldwide Shipping"
            subtitle="We ship your magical finds straight to your door!"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 shadow-card text-center"
          >
            <Truck className="w-16 h-16 text-gold mx-auto mb-4" />
            <h3 className="font-heading text-2xl font-bold text-foreground mb-4">
              Shipping Costs
            </h3>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">
              Shipping costs vary by weight and destination. We provide exact shipping quotes before you finalize your order. We combine shipping when possible for multiple items to save you money!
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Domestic and international shipping available</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-secondary">
        <div className="container-tight">
          <SectionHeading
            title="Pricing Questions"
            subtitle="Common questions about our pricing structure."
          />

          <Accordion type="single" collapsible className="space-y-4">
            {pricingFaqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                viewport={{ once: true }}
              >
                <AccordionItem
                  value={`item-${i}`}
                  className="bg-card rounded-xl px-6 shadow-soft border-none"
                >
                  <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Need Help CTA */}
      <section className="section-padding bg-magic">
        <div className="container-tight text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <MessageCircle className="w-16 h-16 text-gold mx-auto mb-6" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Need Help?
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Send us a message or post your request — we're here to help you find your magical merchandise!
            </p>
            <Button variant="default" size="lg" className="bg-gold hover:bg-gold/90 text-midnight" asChild>
              <a href="https://m.me/" target="_blank" rel="noopener noreferrer">
                Send Us a Message
              </a>
            </Button>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
