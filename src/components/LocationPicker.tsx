'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface LocationPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  label?: string;
}

export function LocationPicker({ value = '', onChange, label = 'Location' }: LocationPickerProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder="Enter location..."
      />
    </div>
  );
}
