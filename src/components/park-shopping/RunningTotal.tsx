"use client";

import { DollarSign } from 'lucide-react';

interface RunningTotalProps {
  total: number;
  itemCount: number;
}

export function RunningTotal({ total, itemCount }: RunningTotalProps) {
  if (itemCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
      <DollarSign className="w-5 h-5 text-emerald-600" />
      <div className="flex-1">
        <span className="text-sm text-emerald-700 dark:text-emerald-400">Found Total:</span>
        <span className="ml-2 font-bold text-emerald-700 dark:text-emerald-400">
          ${total.toFixed(2)}
        </span>
      </div>
      <span className="text-xs text-emerald-600/80">
        {itemCount} item{itemCount !== 1 ? 's' : ''}
      </span>
    </div>
  );
}
