'use client';

import { use } from 'react';
import { ShoppingList } from '@/components/shopping';

interface PageProps {
  params: Promise<{ park: string }>;
}

export default function ParkShoppingPage({ params }: PageProps) {
  const { park } = use(params);
  return <ShoppingList parkCode={park} />;
}
