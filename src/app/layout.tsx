import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { Navbar } from '@/components/NavbarNext';
import { Footer } from '@/components/FooterNext';
import { PWARegister } from '@/components/PWARegister';
import { InstallBanner } from '@/components/InstallBanner';

export const metadata: Metadata = {
  title: 'Enchanted Park Pickups - Theme Park Shopping Made Magical',
  description: 'Personal shopping service for Walt Disney World, Universal Studios, and SeaWorld merchandise. We bring the magic to your doorstep.',
  keywords: 'Disney shopping, Universal Studios merchandise, SeaWorld souvenirs, theme park shopping service, Orlando merchandise',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EPP Admin',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <InstallBanner />
          <Navbar />
          {children}
          <Footer />
          <Toaster position="top-right" richColors />
          <PWARegister />
        </ThemeProvider>
      </body>
    </html>
  );
}
