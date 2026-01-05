/**
 * Mobile Navigation with Slide-Out Drawer
 *
 * Touch-optimized navigation for mobile devices.
 * - Bottom nav bar with 4 quick access items + menu button
 * - Slide-out drawer with ALL navigation items
 * - FAB for quick action
 *
 * Shows at bottom of screen on mobile, hidden on desktop.
 */

'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Users,
  ClipboardList,
  ShoppingCart,
  FileText,
  Package,
  Calculator,
  Wrench,
  Sparkles,
  ShoppingBag,
  Bell,
  Settings,
  Menu,
  X,
  Plus,
  ChevronRight,
  LogOut,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// All navigation items matching sidebar
const allNavItems = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Park Shopping', href: '/admin/park-shopping', icon: MapPin },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Requests', href: '/admin/requests', icon: ClipboardList },
  { name: 'Shopping Trips', href: '/admin/trips', icon: ShoppingCart },
  { name: 'Invoices', href: '/admin/invoices', icon: FileText },
  { name: 'Shipments', href: '/admin/shipments', icon: Package },
  { name: 'Shipping Quote', href: '/admin/shipping-quote', icon: Calculator },
  { name: 'Tools', href: '/admin/tools', icon: Wrench },
  { name: 'New Releases', href: '/admin/releases', icon: Sparkles },
  { name: 'Inventory', href: '/admin/inventory', icon: ShoppingBag },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

// Quick access items for bottom bar (Park Shopping is key for mobile use at parks)
const bottomNavItems = [
  { name: 'Home', href: '/admin', icon: Home },
  { name: 'Shop', href: '/admin/park-shopping', icon: MapPin },
  { name: 'Requests', href: '/admin/requests', icon: ClipboardList },
  { name: 'Trips', href: '/admin/trips', icon: ShoppingCart },
];

export function MobileNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Slide-Out Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-72 bg-card border-l transform transition-transform duration-300 ease-in-out md:hidden',
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="flex items-center justify-between h-14 px-4 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gold" />
              <span className="font-heading font-bold text-foreground">Menu</span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-muted touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation List */}
          <ScrollArea className="flex-1">
            <nav className="p-3 space-y-1">
              {allNavItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors touch-manipulation',
                      active
                        ? 'bg-gold/10 text-gold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {item.name}
                    {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Drawer Footer */}
          <div className="border-t p-4">
            <Link
              href="/"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground touch-manipulation"
            >
              <LogOut className="w-5 h-5" />
              View Public Site
            </Link>
          </div>

          {/* Safe area for iOS */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden">
        <div className="flex items-center h-16">
          {/* Quick access items */}
          {bottomNavItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full',
                  'transition-colors touch-manipulation',
                  active
                    ? 'text-gold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-6 h-6 mb-0.5',
                    active && 'drop-shadow-[0_0_8px_hsl(var(--gold))]'
                  )}
                />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}

          {/* Menu Button */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center flex-1 h-full',
              'transition-colors touch-manipulation',
              'text-muted-foreground hover:text-foreground'
            )}
          >
            <Menu className="w-6 h-6 mb-0.5" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-[env(safe-area-inset-bottom)] bg-card" />
      </nav>
    </>
  );
}

/**
 * Quick Action FAB (Floating Action Button)
 *
 * Fast access to create new request from any page.
 */
export function QuickActionFab() {
  return (
    <Link
      href="/admin/requests/new"
      className={cn(
        // Position above nav bar (h-16 = 64px) + safe area (~34px) + gap
        'fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4 z-50 md:hidden',
        'w-14 h-14 rounded-full',
        'bg-gold text-midnight',
        'flex items-center justify-center',
        'touch-manipulation active:scale-95',
        'transition-transform',
        // Subtle shadow that won't look like a black circle
        'shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
      )}
    >
      <Plus className="w-6 h-6" />
    </Link>
  );
}
