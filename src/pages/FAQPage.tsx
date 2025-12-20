import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/SectionHeading';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'How long does it take to get my items?',
    answer:
      'From request to delivery typically takes 1-3 weeks. This includes our trip to the park (1-2 weeks), processing (1-2 days), and shipping (3-7 days depending on your location). Rush orders may be available for an additional fee.',
  },
  {
    question: 'What if an item is out of stock?',
    answer:
      'We\'ll let you know as soon as we discover an item is unavailable. We can suggest alternatives, keep looking on future trips, or simply remove the item from your request. You\'re never charged for items we can\'t find.',
  },
  {
    question: 'Can you get limited edition or release-day items?',
    answer:
      'We try our best! Limited releases can be tricky due to crowds, purchase limits, and quick sellouts. We can\'t guarantee limited items, but we\'ll do everything we can. These may require an additional fee for the extra effort.',
  },
  {
    question: 'Do you ship internationally?',
    answer:
      'Currently, we only ship within the United States. International shipping involves customs, duties, and other complications that make it difficult to provide the quality service we\'re known for.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept PayPal (our primary method - invoices sent directly), Venmo, and Zelle. All payments are processed before shipping. We do not accept credit cards directly or cash.',
  },
  {
    question: 'What\'s your return/refund policy?',
    answer:
      'All sales are final. Since we purchase items specifically for you, we cannot accept returns. However, if an item arrives damaged or is incorrect, please contact us within 48 hours with photos and we\'ll make it right.',
  },
  {
    question: 'How do I track my order?',
    answer:
      'Once your items ship, you\'ll receive a tracking number via email and/or Facebook Messenger. We ship via USPS Priority Mail or UPS depending on the package size.',
  },
  {
    question: 'Can you shop at the Disney outlets?',
    answer:
      'We don\'t regularly visit the outlet locations, but we can make special trips upon request. Keep in mind that outlet inventory is unpredictable, and we can\'t guarantee finding specific items there.',
  },
  {
    question: 'What if I need to cancel my request?',
    answer:
      'If we haven\'t purchased your items yet, you can cancel at any time with no charge. Once items are purchased, cancellations aren\'t possible since the items are bought specifically for you.',
  },
  {
    question: 'How do you pack fragile items?',
    answer:
      'We take extra care with fragile items like mugs, popcorn buckets, and collectibles. Everything is wrapped in bubble wrap and packed securely. Insurance is included on valuable shipments.',
  },
];

export default function FAQPage() {
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
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Got questions? We've got answers. If you don't see what you're looking 
              for, feel free to reach out.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.03 }}
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

      {/* Still have questions */}
      <section className="section-padding bg-secondary">
        <div className="container-tight text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-foreground mb-4">
              Still Have Questions?
            </h2>
            <p className="text-muted-foreground mb-6">
              We're happy to help! Reach out to us through any of our contact methods.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://m.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gold text-midnight font-semibold px-6 py-3 rounded-lg hover:bg-gold-dark transition-colors"
              >
                Message Us on Facebook
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-2 border-2 border-border text-foreground font-semibold px-6 py-3 rounded-lg hover:bg-muted transition-colors"
              >
                Contact Page
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
