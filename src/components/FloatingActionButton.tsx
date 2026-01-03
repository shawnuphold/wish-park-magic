'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface FloatingActionButtonProps {
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}

export function FloatingActionButton({ onClick, children, className = '' }: FloatingActionButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-50 ${className}`}
    >
      {children}
    </Button>
  );
}
