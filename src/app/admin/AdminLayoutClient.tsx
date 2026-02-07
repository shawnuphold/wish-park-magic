"use client";

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MobileNav, QuickActionFab } from '@/components/admin/MobileNav';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ShoppingCart,
  FileText,
  Package,
  Sparkles,
  ShoppingBag,
  Settings,
  LogOut,
  X,
  ChevronRight,
  Calculator,
  Bell,
  Wrench,
  Download,
  MapPin,
  Search,
  BarChart3,
} from 'lucide-react';
import { InstallBanner } from '@/components/InstallBanner';
import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt';
import { Toaster } from '@/components/ui/toaster';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Park Shopping', href: '/admin/park-shopping', icon: MapPin },
  { name: 'Customers', href: '/admin/customers', icon: Users },
  { name: 'Requests', href: '/admin/requests', icon: ClipboardList },
  { name: 'Shopping Trips', href: '/admin/trips', icon: ShoppingCart },
  { name: 'Invoices', href: '/admin/invoices', icon: FileText },
  { name: 'Shipments', href: '/admin/shipments', icon: Package },
  { name: 'Shipping Quote', href: '/admin/shipping-quote', icon: Calculator },
  { name: 'Product Lookup', href: '/admin/tools/product-lookup', icon: Search },
  { name: 'Tools', href: '/admin/tools', icon: Wrench },
  { name: 'New Releases', href: '/admin/releases', icon: Sparkles },
  { name: 'Inventory', href: '/admin/inventory', icon: ShoppingBag },
  { name: 'Reports', href: '/admin/reports/payments', icon: BarChart3 },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'shopper';
}

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: AdminUser;
}

export default function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isInstallable, isInstalled, isIOS, prompt } = useInstallPrompt();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  const handleInstall = async () => {
    if (!isIOS) {
      await prompt();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile header - shows on mobile only */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-card border-b h-14 flex items-center px-4 md:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gold" />
          <span className="font-heading font-bold text-foreground">EPP Admin</span>
        </Link>
        <div className="flex-1" />
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
          View Site
        </Link>
      </header>

      {/* Desktop sidebar backdrop (for mobile hamburger menu if needed) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Desktop Sidebar - hidden on mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out",
          "hidden md:flex md:flex-col", // Hidden on mobile, flex on desktop
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            <Link href="/admin" className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-gold" />
              <span className="font-heading font-bold text-foreground">Admin</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 px-3 py-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-gold/10 text-gold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {item.name}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* User section */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                <span className="text-gold font-semibold">
                  {user.name?.[0] || user.email?.[0]?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.name || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Desktop Top bar - hidden on mobile */}
        <header className="sticky top-0 z-30 hidden md:flex items-center h-16 px-4 bg-background border-b md:px-6">
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {isInstallable && !isInstalled && !isIOS && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleInstall}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Install App
              </Button>
            )}
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              View Site →
            </Link>
          </div>
        </header>

        {/* PWA Install Banner */}
        <InstallBanner />

        {/* Page content - padding for mobile header (top) and bottom nav */}
        <main className="pt-14 pb-24 p-4 md:pt-0 md:pb-0 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
      <QuickActionFab />
      <Toaster />
    </div>
  );
}
