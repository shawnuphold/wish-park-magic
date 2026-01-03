"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bell, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Database, Park, ItemCategory, NotificationPreferences } from '@/lib/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];

const PARKS: { value: Park; label: string }[] = [
  { value: 'disney', label: 'Disney World' },
  { value: 'universal', label: 'Universal Orlando' },
  { value: 'seaworld', label: 'SeaWorld' },
];

const CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'plush', label: 'Plush' },
  { value: 'pins', label: 'Pins' },
  { value: 'spirit_jersey', label: 'Spirit Jersey' },
  { value: 'loungefly', label: 'Loungefly' },
  { value: 'apparel', label: 'Apparel' },
  { value: 'home_decor', label: 'Home & Decor' },
  { value: 'ears', label: 'Ears' },
  { value: 'collectible', label: 'MagicBand/Collectible' },
  { value: 'popcorn_bucket', label: 'Popcorn Bucket' },
  { value: 'drinkware', label: 'Drinkware' },
  { value: 'toys', label: 'Toys' },
  { value: 'jewelry', label: 'Jewelry' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: false,
  parks: [],
  categories: [],
  park_exclusives_only: true,
};

export default function CustomerPreferencesPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { toast } = useToast();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;

        // Cast to handle notification_preferences which may not be in generated types
        const customerData = data as Customer;
        setCustomer(customerData);
        // Parse notification preferences with defaults
        const prefs = (customerData as any).notification_preferences as NotificationPreferences | null;
        setPreferences({
          enabled: prefs?.enabled ?? false,
          parks: prefs?.parks ?? [],
          categories: prefs?.categories ?? [],
          park_exclusives_only: prefs?.park_exclusives_only ?? true,
        });
      } catch (error) {
        console.error('Error fetching customer:', error);
        toast({
          title: 'Error',
          description: 'Failed to load customer preferences',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCustomer();
  }, [id, toast]);

  const handleParkToggle = (park: Park) => {
    setPreferences(prev => ({
      ...prev,
      parks: prev.parks.includes(park)
        ? prev.parks.filter(p => p !== park)
        : [...prev.parks, park],
    }));
  };

  const handleCategoryToggle = (category: ItemCategory) => {
    setPreferences(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSelectAllParks = () => {
    setPreferences(prev => ({
      ...prev,
      parks: PARKS.map(p => p.value),
    }));
  };

  const handleSelectAllCategories = () => {
    setPreferences(prev => ({
      ...prev,
      categories: CATEGORIES.map(c => c.value),
    }));
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          notification_preferences: preferences,
        } as any)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Preferences Saved',
        description: 'Customer notification preferences have been updated.',
      });

      router.push(`/admin/customers/${id}`);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preferences. Please try again.',
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

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Customer not found</p>
        <Link href="/admin/customers">
          <Button variant="outline" className="mt-4">Back to Customers</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/customers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">
            Notification Preferences
          </h1>
          <p className="text-muted-foreground">{customer.name}</p>
        </div>
      </div>

      {/* Enable Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gold" />
            New Release Notifications
          </CardTitle>
          <CardDescription>
            Send email alerts when new merchandise releases match their interests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled" className="text-base font-medium">
                Enable Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Customer will receive emails about new releases
              </p>
            </div>
            <Switch
              id="enabled"
              checked={preferences.enabled}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Park Exclusives Only */}
      <Card>
        <CardHeader>
          <CardTitle>Park Exclusives Only</CardTitle>
          <CardDescription>
            Only notify for items they can&apos;t buy online - our real value prop!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="park-exclusive" className="text-base font-medium">
                Park Exclusives Only
              </Label>
              <p className="text-sm text-muted-foreground">
                Skip notifications for items available on shopDisney
              </p>
            </div>
            <Switch
              id="park-exclusive"
              checked={preferences.park_exclusives_only}
              onCheckedChange={(checked) =>
                setPreferences(prev => ({ ...prev, park_exclusives_only: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Parks Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Parks</CardTitle>
            <CardDescription>
              Which parks should we notify about?
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectAllParks}
          >
            Select All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PARKS.map((park) => (
              <label
                key={park.value}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  preferences.parks.includes(park.value)
                    ? 'border-gold bg-gold/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={preferences.parks.includes(park.value)}
                  onCheckedChange={() => handleParkToggle(park.value)}
                />
                <span className="font-medium">{park.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Categories Selection */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Categories</CardTitle>
            <CardDescription>
              What types of merchandise interests them?
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSelectAllCategories}
          >
            Select All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {CATEGORIES.map((category) => (
              <label
                key={category.value}
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  preferences.categories.includes(category.value)
                    ? 'border-gold bg-gold/5'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <Checkbox
                  checked={preferences.categories.includes(category.value)}
                  onCheckedChange={() => handleCategoryToggle(category.value)}
                />
                <span className="text-sm">{category.label}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {preferences.enabled && (
        <Card className="border-gold/30 bg-gold/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-gold mt-0.5" />
              <div>
                <p className="font-medium">
                  {customer.name} will receive notifications for:
                </p>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  {preferences.parks.length > 0 ? (
                    <li>
                      Parks:{' '}
                      {preferences.parks.map(p =>
                        PARKS.find(park => park.value === p)?.label
                      ).join(', ')}
                    </li>
                  ) : (
                    <li className="text-orange-600">No parks selected (will not receive notifications)</li>
                  )}
                  {preferences.categories.length > 0 ? (
                    <li>
                      Categories:{' '}
                      {preferences.categories.length === CATEGORIES.length
                        ? 'All categories'
                        : preferences.categories.map(c =>
                            CATEGORIES.find(cat => cat.value === c)?.label
                          ).join(', ')}
                    </li>
                  ) : (
                    <li className="text-orange-600">No categories selected (will not receive notifications)</li>
                  )}
                  {preferences.park_exclusives_only && (
                    <li>Only park exclusive items (not available online)</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Link href={`/admin/customers/${id}`}>
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button onClick={handleSave} disabled={saving} variant="gold">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
