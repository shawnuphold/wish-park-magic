import { motion } from 'framer-motion';
import { SectionHeading } from '@/components/SectionHeading';
import { Heart, Users, Award, MapPin } from 'lucide-react';
import teamShopping from '@/assets/team-shopping.png';

const values = [
  {
    icon: Heart,
    title: 'Personal Service',
    description:
      'We treat every order like it\'s for a friend. Because to us, you are.',
  },
  {
    icon: Award,
    title: 'Fair Pricing',
    description:
      'No ridiculous markups. Just honest prices for quality service.',
  },
  {
    icon: MapPin,
    title: 'Park Expertise',
    description:
      'As Orlando locals, we know where to find the hidden gems.',
  },
];

export default function AboutPage() {
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
              Meet the Family
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              We're a local Orlando family who loves the parks as much as you do.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="rounded-3xl overflow-hidden shadow-elevated">
                <img 
                  src={teamShopping} 
                  alt="Our team shopping at Disney World" 
                  className="w-full h-auto object-cover"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  Hi! We're the family behind Enchanted Park Pickups. As Orlando locals 
                  and lifelong theme park enthusiasts, we've spent countless hours 
                  exploring every corner of Disney World, Universal Orlando, and SeaWorld.
                </p>
                <p>
                  We started this service when friends and family who lived far away 
                  kept asking us to pick up items for them. What began as favors for 
                  loved ones turned into a passion for helping fellow park fans 
                  around the country get the merchandise they love.
                </p>
                <p>
                  Unlike big reseller operations, we're just a family who genuinely 
                  enjoys visiting the parks. We take pride in providing personal 
                  service, fair prices, and the kind of attention to detail you'd 
                  expect from a friend, not a faceless company.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <SectionHeading
            title="Our Values"
            subtitle="What sets us apart from other personal shopper services."
          />

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-card rounded-2xl p-8 shadow-card text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-6">
                  <value.icon className="w-8 h-8 text-gold" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-3">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="section-padding bg-background">
        <div className="container-tight">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-magic rounded-3xl p-8 md:p-12"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="font-heading text-4xl md:text-5xl font-bold text-gold mb-2">
                  2020
                </div>
                <p className="text-primary-foreground/70">Serving Since</p>
              </div>
              <div>
                <div className="font-heading text-4xl md:text-5xl font-bold text-gold mb-2">
                  1000+
                </div>
                <p className="text-primary-foreground/70">Happy Customers</p>
              </div>
              <div>
                <div className="font-heading text-4xl md:text-5xl font-bold text-gold mb-2">
                  3
                </div>
                <p className="text-primary-foreground/70">Parks Covered</p>
              </div>
              <div>
                <div className="font-heading text-4xl md:text-5xl font-bold text-gold mb-2">
                  48hr
                </div>
                <p className="text-primary-foreground/70">Shipping Time</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Community */}
      <section className="section-padding bg-secondary">
        <div className="container-tight text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Users className="w-16 h-16 text-gold mx-auto mb-6" />
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Part of the Community
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We're proud members of the theme park fan community. Join our Facebook 
              group to connect with fellow enthusiasts, see our latest finds, and 
              get first dibs on unclaimed items.
            </p>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
