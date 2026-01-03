'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { SmartScreenshotParser } from '@/components/admin/SmartScreenshotParser';

function FromScreenshotContent() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get('customer');
  const customerName = searchParams.get('name');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/requests">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Smart Screenshot Parser
          </h1>
          <p className="text-muted-foreground">
            Upload any screenshot - AI detects messages or merchandise
          </p>
        </div>
      </div>

      <SmartScreenshotParser
        customerId={customerId || undefined}
        customerName={customerName || undefined}
      />
    </div>
  );
}

export default function FromScreenshotPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
        </div>
      }
    >
      <FromScreenshotContent />
    </Suspense>
  );
}
