'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Facebook, Instagram, Mail, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';

const quickLinks = [
  { name: 'Services', href: '/services' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'How It Works', href: '/how-it-works' },
  { name: 'Shop', href: '/shop' },
];

const supportLinks = [
  { name: 'About Us', href: '/about' },
  { name: 'FAQ', href: '/faq' },
  { name: 'Contact', href: '/contact' },
];

export function Footer() {
  const [email, setEmail] = useState('');
  const pathname = usePathname();

  // Don't show footer on admin pages
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success("Thanks for subscribing! We'll be in touch.");
      setEmail('');
    }
  };

  return (
    <footer className="bg-[hsl(222,50%,17%)] text-white">
      {/* Main Footer */}
      <div className="container-wide py-16 md:py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <Link href="/" className="block mb-4">
              <span className="text-2xl font-heading font-bold text-gold">
                Enchanted Park Pickups
              </span>
            </Link>
            <p className="text-white/70 text-sm leading-relaxed mb-6">
              Your personal shoppers for Disney World, Universal Orlando, and SeaWorld.
              We bring the magic to your doorstep.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-[hsl(222,50%,17%)] transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-[hsl(222,50%,17%)] transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="mailto:hello@enchantedparkpickups.com"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-gold hover:text-[hsl(222,50%,17%)] transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-gold transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              {supportLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 hover:text-gold transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/portal"
                  className="text-white/70 hover:text-gold transition-colors text-sm"
                >
                  Customer Portal Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-heading text-lg font-semibold mb-4">Stay Updated</h4>
            <p className="text-white/70 text-sm mb-4">
              Get notified about new arrivals and exclusive deals.
            </p>
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              <Button
                type="submit"
                className="w-full bg-gold hover:bg-gold/90 text-[hsl(222,50%,17%)]"
              >
                Subscribe
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="container-wide py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/60">
            <p>&copy; {new Date().getFullYear()} Enchanted Park Pickups. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>We accept:</span>
                <div className="flex items-center gap-1 bg-[#0070BA] text-white px-2 py-1 rounded text-xs font-semibold">
                  <CreditCard className="w-3 h-3" />
                  PayPal
                </div>
              </div>
              <span className="hidden md:inline">•</span>
              <p className="hidden md:block">
                Not affiliated with Disney, Universal, or SeaWorld.
              </p>
            </div>
          </div>
          <p className="md:hidden text-center mt-2 text-sm text-white/60">
            Not affiliated with Disney, Universal, or SeaWorld.
          </p>
        </div>
      </div>
    </footer>
  );
}
