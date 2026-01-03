'use client';

import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';
import { X, Download, Share } from 'lucide-react';

export function InstallBanner() {
  const { isInstallable, isInstalled, isIOS, prompt, dismiss, isDismissed } = useInstallPrompt();

  // Don't show if already installed, dismissed, or not installable
  if (isInstalled || isDismissed || !isInstallable) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      // Can't programmatically install on iOS, just show instructions
      return;
    }
    await prompt();
  };

  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
            <Download className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm sm:text-base">
              Install EPP Admin
            </p>
            {isIOS ? (
              <p className="text-xs sm:text-sm text-white/80 truncate">
                Tap <Share className="inline h-3 w-3 mx-1" /> then &quot;Add to Home Screen&quot;
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-white/80 truncate">
                Get quick access from your home screen
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIOS && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleInstall}
              className="bg-white text-purple-700 hover:bg-white/90"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Install
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={dismiss}
            className="text-white hover:bg-white/20 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
