"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, DollarSign, Percent, Building, Truck, CreditCard, Tag, Castle, Download, Smartphone, Share } from 'lucide-react';
import { useInstallPrompt } from '@/lib/hooks/useInstallPrompt';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface DiscountTier {
  min_order: number;
  discount_percent: number;
}

interface Settings {
  pickup_fee_standard: number;
  pickup_fee_specialty_percent: number;
  florida_tax_rate: number;
  business_name: string;
  business_email: string;
  from_name: string;
  from_street1: string;
  from_street2: string;
  from_city: string;
  from_state: string;
  from_zip: string;
  from_phone: string;
  // Advanced pricing
  cc_processing_fee_percent: number;
  cc_fixed_transaction_fee: number;
  markup_percent: number;
  shipping_markup_percent: number;
  discount_tiers: DiscountTier[];
  // Park features
  epic_universe_enabled: boolean;
}

const defaultSettings: Settings = {
  pickup_fee_standard: 6.00,
  pickup_fee_specialty_percent: 0.10,
  florida_tax_rate: 0.065,
  business_name: 'Enchanted Park Pickups',
  business_email: 'hello@enchantedparkpickups.com',
  from_name: '',
  from_street1: '',
  from_street2: '',
  from_city: 'Orlando',
  from_state: 'FL',
  from_zip: '',
  from_phone: '',
  // Advanced pricing defaults
  cc_processing_fee_percent: 0.029, // 2.9%
  cc_fixed_transaction_fee: 0.30,   // $0.30
  markup_percent: 0.15,             // 15%
  shipping_markup_percent: 0,       // 0% default
  discount_tiers: [
    { min_order: 500, discount_percent: 0.05 },  // 5% off orders over $500
    { min_order: 1000, discount_percent: 0.10 }, // 10% off orders over $1000
  ],
  // Park features
  epic_universe_enabled: false, // Enable when Epic Universe opens (2025)
};

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isInstallable, isInstalled, isIOS, prompt, dismiss, isDismissed } = useInstallPrompt();

  const handleInstall = async () => {
    if (!isIOS) {
      await prompt();
    }
  };

  const resetInstallBanner = () => {
    localStorage.removeItem('pwa-install-dismissed');
    window.location.reload();
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('key, value');

        if (error) throw error;

        const settingsMap: Partial<Settings> = {};
        data?.forEach((s) => {
          try {
            const value = typeof s.value === 'string' ? JSON.parse(s.value) : s.value;
            (settingsMap as Record<string, unknown>)[s.key] = value;
          } catch {
            // Skip invalid JSON values
            console.warn(`Skipping invalid setting: ${s.key}`);
          }
        });

        setSettings((prev) => ({ ...prev, ...settingsMap }));
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleChange = (key: keyof Settings, value: string | number | boolean | DiscountTier[]) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Upsert each setting
      const settingsToSave = Object.entries(settings).map(([key, value]) => ({
        key,
        value: JSON.stringify(value),
      }));

      for (const setting of settingsToSave) {
        const { error } = await supabase
          .from('settings')
          .upsert(
            { key: setting.key, value: setting.value },
            { onConflict: 'key' }
          );

        if (error) throw error;
      }

      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your business settings and configurations</p>
      </div>

      <div className="grid gap-6">
        {/* Business Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Business Information
            </CardTitle>
            <CardDescription>Your business details for invoices and communications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={settings.business_name}
                  onChange={(e) => handleChange('business_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="business_email">Business Email</Label>
                <Input
                  id="business_email"
                  type="email"
                  value={settings.business_email}
                  onChange={(e) => handleChange('business_email', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Pricing
            </CardTitle>
            <CardDescription>Configure pickup fees and tax rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pickup_fee_standard">Standard Pickup Fee ($)</Label>
                <Input
                  id="pickup_fee_standard"
                  type="number"
                  step="0.01"
                  value={settings.pickup_fee_standard}
                  onChange={(e) => handleChange('pickup_fee_standard', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Flat fee for non-specialty items
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_fee_specialty_percent">Specialty Pickup Fee (%)</Label>
                <Input
                  id="pickup_fee_specialty_percent"
                  type="number"
                  step="0.01"
                  value={settings.pickup_fee_specialty_percent * 100}
                  onChange={(e) => handleChange('pickup_fee_specialty_percent', parseFloat(e.target.value) / 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Percentage for Loungefly, popcorn buckets
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="florida_tax_rate">Florida Tax Rate (%)</Label>
                <Input
                  id="florida_tax_rate"
                  type="number"
                  step="0.001"
                  value={settings.florida_tax_rate * 100}
                  onChange={(e) => handleChange('florida_tax_rate', parseFloat(e.target.value) / 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Applied to all invoices
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credit Card Processing Fees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Processing Fees
            </CardTitle>
            <CardDescription>Configure credit card processing costs to pass through to customers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cc_processing_fee_percent">Processing Fee (%)</Label>
                <Input
                  id="cc_processing_fee_percent"
                  type="number"
                  step="0.1"
                  value={settings.cc_processing_fee_percent * 100}
                  onChange={(e) => handleChange('cc_processing_fee_percent', parseFloat(e.target.value) / 100)}
                />
                <p className="text-xs text-muted-foreground">
                  PayPal/Stripe typically charge 2.9%
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cc_fixed_transaction_fee">Fixed Transaction Fee ($)</Label>
                <Input
                  id="cc_fixed_transaction_fee"
                  type="number"
                  step="0.01"
                  value={settings.cc_fixed_transaction_fee}
                  onChange={(e) => handleChange('cc_fixed_transaction_fee', parseFloat(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Per-transaction fee, typically $0.30
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Markup & Discounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Markup & Discounts
            </CardTitle>
            <CardDescription>Configure markup percentages and volume discounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="markup_percent">Item Markup (%)</Label>
                <Input
                  id="markup_percent"
                  type="number"
                  step="0.1"
                  value={settings.markup_percent * 100}
                  onChange={(e) => handleChange('markup_percent', parseFloat(e.target.value) / 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Added to item cost for your profit margin
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shipping_markup_percent">Shipping Markup (%)</Label>
                <Input
                  id="shipping_markup_percent"
                  type="number"
                  step="0.1"
                  value={settings.shipping_markup_percent * 100}
                  onChange={(e) => handleChange('shipping_markup_percent', parseFloat(e.target.value) / 100)}
                />
                <p className="text-xs text-muted-foreground">
                  Added to shipping cost for handling
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Volume Discount Tiers</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatic discounts for larger orders
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newTiers = [...settings.discount_tiers, { min_order: 0, discount_percent: 0 }];
                    setSettings(prev => ({ ...prev, discount_tiers: newTiers }));
                  }}
                >
                  Add Tier
                </Button>
              </div>

              {settings.discount_tiers.map((tier, index) => (
                <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1 grid gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Minimum Order ($)</Label>
                      <Input
                        type="number"
                        step="50"
                        value={tier.min_order}
                        onChange={(e) => {
                          const newTiers = [...settings.discount_tiers];
                          newTiers[index].min_order = parseFloat(e.target.value) || 0;
                          setSettings(prev => ({ ...prev, discount_tiers: newTiers }));
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Discount (%)</Label>
                      <Input
                        type="number"
                        step="1"
                        value={tier.discount_percent * 100}
                        onChange={(e) => {
                          const newTiers = [...settings.discount_tiers];
                          newTiers[index].discount_percent = (parseFloat(e.target.value) || 0) / 100;
                          setSettings(prev => ({ ...prev, discount_tiers: newTiers }));
                        }}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => {
                      const newTiers = settings.discount_tiers.filter((_, i) => i !== index);
                      setSettings(prev => ({ ...prev, discount_tiers: newTiers }));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}

              {settings.discount_tiers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No discount tiers configured. Click &quot;Add Tier&quot; to create one.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipping From Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Ship From Address
            </CardTitle>
            <CardDescription>Default return address for shipping labels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="from_name">Name</Label>
                <Input
                  id="from_name"
                  value={settings.from_name}
                  onChange={(e) => handleChange('from_name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from_phone">Phone</Label>
                <Input
                  id="from_phone"
                  type="tel"
                  value={settings.from_phone}
                  onChange={(e) => handleChange('from_phone', e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_street1">Street Address</Label>
              <Input
                id="from_street1"
                value={settings.from_street1}
                onChange={(e) => handleChange('from_street1', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="from_street2">Street Address 2</Label>
              <Input
                id="from_street2"
                value={settings.from_street2}
                onChange={(e) => handleChange('from_street2', e.target.value)}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="from_city">City</Label>
                <Input
                  id="from_city"
                  value={settings.from_city}
                  onChange={(e) => handleChange('from_city', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from_state">State</Label>
                <Input
                  id="from_state"
                  value={settings.from_state}
                  onChange={(e) => handleChange('from_state', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from_zip">ZIP Code</Label>
                <Input
                  id="from_zip"
                  value={settings.from_zip}
                  onChange={(e) => handleChange('from_zip', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Park Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Castle className="w-5 h-5" />
              Park Features
            </CardTitle>
            <CardDescription>Toggle features for upcoming park changes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor="epic_universe_enabled" className="font-medium">
                    Epic Universe
                  </Label>
                  {!settings.epic_universe_enabled && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  )}
                  {settings.epic_universe_enabled && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable to show Epic Universe stores in location dropdowns.
                  Toggle on when the park opens in May 2025.
                </p>
              </div>
              <Switch
                id="epic_universe_enabled"
                checked={settings.epic_universe_enabled}
                onCheckedChange={(checked) => handleChange('epic_universe_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Keys Info */}
        <Card>
          <CardHeader>
            <CardTitle>API Integrations</CardTitle>
            <CardDescription>
              API keys are configured via environment variables for security
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span>PayPal</span>
                <span className="text-muted-foreground">
                  {process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? 'Configured' : 'Not configured'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span>Shippo</span>
                <span className="text-muted-foreground">Configure in .env</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span>Supabase</span>
                <span className="text-green-600">Connected</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Install App */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Install App
            </CardTitle>
            <CardDescription>Add this app to your home screen for quick access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isInstalled ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                <Download className="w-5 h-5" />
                <span>App is installed on this device</span>
              </div>
            ) : isIOS ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  To install on iOS:
                </p>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                  <Share className="w-5 h-5" />
                  <span className="text-sm">Tap Share, then &quot;Add to Home Screen&quot;</span>
                </div>
              </div>
            ) : isInstallable ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleInstall}>
                  <Download className="w-4 h-4 mr-2" />
                  Install App
                </Button>
                {isDismissed && (
                  <Button variant="outline" onClick={resetInstallBanner}>
                    Show Install Banner
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Install option not available. Try using Chrome browser.
                </p>
                {isDismissed && (
                  <Button variant="outline" size="sm" onClick={resetInstallBanner}>
                    Reset Install Banner
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button variant="gold" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
