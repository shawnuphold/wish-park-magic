import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { MessageCircle, Users, Mail, Clock, Upload } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    park: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success('Message sent! We\'ll get back to you within 24 hours.');
    setFormData({ name: '', email: '', phone: '', park: '', message: '' });
    setIsSubmitting(false);
  };

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
              Get in Touch
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
              Ready to start your request or have questions? We're here to help!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact Options */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          {/* Primary CTAs */}
          <div className="grid md:grid-cols-2 gap-6 mb-16 max-w-3xl mx-auto">
            <motion.a
              href="https://m.me/"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 p-6 bg-card rounded-2xl shadow-card hover:shadow-elevated transition-all border border-border/50 group"
            >
              <div className="w-14 h-14 rounded-xl bg-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircle className="w-7 h-7 text-midnight" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-1">
                  Message Us on Facebook
                </h3>
                <p className="text-muted-foreground text-sm">
                  Fastest way to reach us
                </p>
              </div>
            </motion.a>

            <motion.a
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 p-6 bg-card rounded-2xl shadow-card hover:shadow-elevated transition-all border border-border/50 group"
            >
              <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-gold" />
              </div>
              <div>
                <h3 className="font-heading text-xl font-semibold text-foreground mb-1">
                  Join Our Facebook Group
                </h3>
                <p className="text-muted-foreground text-sm">
                  Connect with the community
                </p>
              </div>
            </motion.a>
          </div>

          {/* Contact Form */}
          <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <div className="bg-card rounded-2xl p-8 shadow-card border border-border/50">
                <h2 className="font-heading text-2xl font-bold text-foreground mb-6">
                  Send Us a Message
                </h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="park">Preferred Park</Label>
                      <Select
                        value={formData.park}
                        onValueChange={(value) =>
                          setFormData({ ...formData, park: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a park" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disney">Disney World</SelectItem>
                          <SelectItem value="universal">Universal Orlando</SelectItem>
                          <SelectItem value="seaworld">SeaWorld</SelectItem>
                          <SelectItem value="multiple">Multiple Parks</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      required
                      placeholder="Tell us what items you're looking for, or ask any questions..."
                      rows={5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Reference Images (optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-gold/50 transition-colors cursor-pointer">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG up to 10MB
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="gold"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="lg:col-span-2 space-y-6"
            >
              <div className="bg-secondary rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-gold" />
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Response Time
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  We typically respond within 24 hours. Facebook Messenger 
                  is the fastest way to reach us.
                </p>
              </div>

              <div className="bg-secondary rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Mail className="w-6 h-6 text-gold" />
                  <h3 className="font-heading text-lg font-semibold text-foreground">
                    Email
                  </h3>
                </div>
                <a
                  href="mailto:hello@enchantedparkpickups.com"
                  className="text-gold hover:text-gold-dark transition-colors"
                >
                  hello@enchantedparkpickups.com
                </a>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-gold/20">
                <h3 className="font-heading text-lg font-semibold text-foreground mb-3">
                  Tips for Your Request
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-gold">✦</span>
                    Include photos or links to the items you want
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold">✦</span>
                    Specify sizes, colors, and variations
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold">✦</span>
                    Let us know if your request is time-sensitive
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-gold">✦</span>
                    Mention any alternatives you'd accept
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
