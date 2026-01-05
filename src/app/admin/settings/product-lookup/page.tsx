'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Search, Eye, Bot, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Settings {
  product_lookup_provider: string;
  serpapi_monthly_limit: number;
  serpapi_usage_count: number;
  google_vision_enabled: boolean;
  claude_fallback_enabled: boolean;
}

interface Usage {
  serpapi: { used: number; limit: number };
  google_vision: { used: number };
}

export default function ProductLookupSettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    product_lookup_provider: 'serpapi',
    serpapi_monthly_limit: 250,
    serpapi_usage_count: 0,
    google_vision_enabled: true,
    claude_fallback_enabled: true
  });
  const [usage, setUsage] = useState<Usage>({
    serpapi: { used: 0, limit: 250 },
    google_vision: { used: 0 }
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings/product-lookup');
      const data = await res.json();
      if (data.settings) {
        setSettings(prev => ({ ...prev, ...data.settings }));
      }
      if (data.usage) {
        setUsage(data.usage);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/settings/product-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const resetUsage = async () => {
    if (!confirm('Reset SerpApi usage counter to 0?')) return;
    try {
      await fetch('/api/settings/product-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_serpapi_usage' })
      });
      await fetchSettings();
    } catch (error) {
      console.error('Failed to reset usage:', error);
    }
  };

  const serpPercent = (usage.serpapi.used / usage.serpapi.limit) * 100;
  const isLow = serpPercent > 80;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Product Lookup Settings</h1>
          <p className="text-muted-foreground">Configure AI-powered product identification</p>
        </div>
      </div>

      {/* Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            API Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SerpApi Usage */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">SerpApi (Google Lens)</span>
              <span className={isLow ? 'text-red-500 font-bold' : ''}>
                {usage.serpapi.used} / {usage.serpapi.limit} requests
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${
                  isLow ? 'bg-red-500' : serpPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(serpPercent, 100)}%` }}
              />
            </div>
            {isLow && (
              <div className="flex items-center gap-2 mt-2 text-red-500 text-sm">
                <AlertTriangle className="h-4 w-4" />
                Running low! Consider upgrading or switching to Google Vision.
              </div>
            )}
            <div className="flex justify-end mt-2">
              <Button variant="outline" size="sm" onClick={resetUsage}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Reset Counter
              </Button>
            </div>
          </div>

          {/* Google Vision Usage */}
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Google Cloud Vision</span>
              <span className="text-muted-foreground">
                {usage.google_vision.used} requests (~${(usage.google_vision.used * 0.0045).toFixed(2)})
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Primary Provider */}
      <Card>
        <CardHeader>
          <CardTitle>Primary Search Provider</CardTitle>
          <CardDescription>
            Choose the main AI service for product identification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              settings.product_lookup_provider === 'serpapi'
                ? 'border-gold bg-gold/5'
                : 'hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="serpapi"
              checked={settings.product_lookup_provider === 'serpapi'}
              onChange={() => setSettings(s => ({ ...s, product_lookup_provider: 'serpapi' }))}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Search className="h-4 w-4 text-gold" />
                SerpApi (Google Lens)
                <span className="text-xs bg-gold/20 text-gold px-2 py-0.5 rounded">Recommended</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Best accuracy - uses Google Lens to find exact product matches from Disney blogs,
                ShopDisney, and resale sites. 250 free searches/month.
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              settings.product_lookup_provider === 'google_vision'
                ? 'border-gold bg-gold/5'
                : 'hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="google_vision"
              checked={settings.product_lookup_provider === 'google_vision'}
              onChange={() => setSettings(s => ({ ...s, product_lookup_provider: 'google_vision' }))}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Eye className="h-4 w-4 text-blue-500" />
                Google Cloud Vision
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Good for labels and text detection. Detects product types, colors, and characters.
                Pay-per-use (~$0.0045/request).
              </p>
            </div>
          </label>

          <label
            className={`flex items-start gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
              settings.product_lookup_provider === 'claude_only'
                ? 'border-gold bg-gold/5'
                : 'hover:bg-muted/50'
            }`}
          >
            <input
              type="radio"
              name="provider"
              value="claude_only"
              checked={settings.product_lookup_provider === 'claude_only'}
              onChange={() => setSettings(s => ({ ...s, product_lookup_provider: 'claude_only' }))}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 font-medium">
                <Bot className="h-4 w-4 text-purple-500" />
                Claude AI Only
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Uses Claude to describe the product and match against local database.
                No external image search. Good for budget-conscious usage.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Fallback Options */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback Options</CardTitle>
          <CardDescription>
            Configure backup methods when primary provider fails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.google_vision_enabled}
              onChange={e => setSettings(s => ({ ...s, google_vision_enabled: e.target.checked }))}
              className="w-4 h-4"
            />
            <div>
              <span className="font-medium">Use Google Vision as fallback</span>
              <p className="text-sm text-muted-foreground">
                When primary provider fails or is unavailable
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.claude_fallback_enabled}
              onChange={e => setSettings(s => ({ ...s, claude_fallback_enabled: e.target.checked }))}
              className="w-4 h-4"
            />
            <div>
              <span className="font-medium">Use Claude AI as final fallback</span>
              <p className="text-sm text-muted-foreground">
                When all image search methods fail, use Claude to describe the product
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button
          onClick={saveSettings}
          disabled={saving}
          className="bg-gold hover:bg-gold/90 text-midnight"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
        {saved && (
          <span className="flex items-center gap-1 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            Saved successfully
          </span>
        )}
      </div>
    </div>
  );
}
