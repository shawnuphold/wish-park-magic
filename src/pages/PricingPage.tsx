import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/SectionHeading';
import { CheckCircle, Info } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const pricingExamples = [
  {
    title: 'Mickey Ears',
    retail: 34.99,
    isSpecialty: false,
  },
  {
    title: 'Loungefly Backpack',
    retail: 85.0,
    isSpecialty: true,
  },
  {
    title: 'Spirit Jersey',
    retail: 74.99,
    isSpecialty: false,
  },
];

const pricingFaqs = [
  {
    question: 'What qualifies as a specialty item?',
    answer:
      'Specialty items include Loungefly bags, premium popcorn buckets, limited edition collectibles, and items over $75 retail value. These require more effort to locate and secure.',
  },
  {
    question: 'Are there any hidden fees?',
    answer:
      'Absolutely not! Our pricing is transparent: Retail + FL Tax + Pickup Fee + Shipping. That\'s it.',
  },
  {
    question: 'Do you charge per item or per order?',
    answer:
      'We charge per item. If you order multiple items, each gets its own pickup fee. However, we do offer discounts on shipping when multiple items can be combined.',
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
];

function calculateTotal(retail: number, isSpecialty: boolean) {
  const tax = retail * 0.065;
  const pickupFee = isSpecialty ? retail * 0.1 : 6;
  const shipping = 8.99; // estimated
  return {
    retail,
    tax,
    pickupFee,
    shipping,
    total: retail + tax + pickupFee + shipping,
  };
}

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
              No hidden fees, no surprises. Just fair pricing for quality service.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Breakdown */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <SectionHeading
            title="How Pricing Works"
            subtitle="Our fees are simple and straightforward."
          />

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Standard Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card border border-border/50"
            >
              <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                Standard Items
              </h3>
              <p className="text-muted-foreground mb-6">
                Most merchandise like apparel, ears, pins, and drinkware
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-foreground">
                  <span>Retail Price</span>
                  <span className="font-medium">Item cost</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>Florida Sales Tax</span>
                  <span className="font-medium">6.5%</span>
                </div>
                <div className="flex justify-between text-gold font-semibold">
                  <span>Pickup Fee</span>
                  <span>$6.00 flat</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>Shipping</span>
                  <span className="font-medium">Based on weight</span>
                </div>
              </div>
            </motion.div>

            {/* Specialty Items */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-card border border-gold/30 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 bg-gold text-midnight text-xs px-3 py-1 rounded-full font-semibold">
                Premium
              </div>
              <h3 className="font-heading text-2xl font-bold text-foreground mb-2">
                Specialty Items
              </h3>
              <p className="text-muted-foreground mb-6">
                Loungefly bags, popcorn buckets, premium collectibles
              </p>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-foreground">
                  <span>Retail Price</span>
                  <span className="font-medium">Item cost</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>Florida Sales Tax</span>
                  <span className="font-medium">6.5%</span>
                </div>
                <div className="flex justify-between text-gold font-semibold">
                  <span>Pickup Fee</span>
                  <span>10% of retail</span>
                </div>
                <div className="flex justify-between text-foreground">
                  <span>Shipping</span>
                  <span className="font-medium">Based on weight</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* No Minimum Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-2 bg-gold/10 text-gold px-6 py-3 rounded-full mx-auto w-fit mb-16"
          >
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">No Minimum Order Required</span>
          </motion.div>
        </div>
      </section>

      {/* Example Pricing */}
      <section className="section-padding bg-secondary">
        <div className="container-tight">
          <SectionHeading
            title="Example Pricing"
            subtitle="See exactly what you'd pay for popular items."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {pricingExamples.map((example, i) => {
              const calc = calculateTotal(example.retail, example.isSpecialty);
              return (
                <motion.div
                  key={example.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-card rounded-2xl p-6 shadow-card"
                >
                  <h4 className="font-heading text-lg font-semibold text-foreground mb-4">
                    {example.title}
                  </h4>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Retail</span>
                      <span>${calc.retail.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FL Tax (6.5%)</span>
                      <span>${calc.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Pickup ({example.isSpecialty ? '10%' : '$6'})
                      </span>
                      <span>${calc.pickupFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping (est.)</span>
                      <span>${calc.shipping.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between font-semibold text-lg">
                    <span className="text-foreground">Total</span>
                    <span className="text-gold">${calc.total.toFixed(2)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Shipping Estimates */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <SectionHeading
            title="Shipping Estimates"
            subtitle="Shipping costs vary by weight and destination."
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-card rounded-2xl p-8 shadow-card"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground">
                      Region
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Small (under 1lb)
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Medium (1-3lbs)
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-foreground">
                      Large (3-5lbs)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-foreground">Southeast US</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$6.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$9.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$14.99</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-foreground">East Coast</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$7.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$11.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$16.99</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-foreground">Midwest</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$8.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$12.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$18.99</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-3 px-4 text-foreground">West Coast</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$9.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$14.99</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">$21.99</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex items-start gap-2 mt-4 text-sm text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Shipping quotes are estimates. Actual costs may vary based on package dimensions. 
                We combine shipping when possible for multiple items.
              </p>
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
    </main>
  );
}
