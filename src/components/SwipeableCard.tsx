'use client';

import { ReactNode } from 'react';

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableCard({ children, className = '' }: SwipeableCardProps) {
  return (
    <div className={`bg-card rounded-lg border p-4 ${className}`}>
      {children}
    </div>
  );
}
