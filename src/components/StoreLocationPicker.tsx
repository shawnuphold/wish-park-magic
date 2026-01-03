'use client';

import { useState, useEffect, useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ParkStore {
  id: string;
  park: string;
  land: string | null;
  store_name: string;
  store_type: string;
  notes: string | null;
}

interface ParkStoresByLocation {
  parks: string[];
  landsByPark: Record<string, string[]>;
  storesByParkAndLand: Record<string, Record<string, ParkStore[]>>;
}

export interface StoreLocation {
  park: string;
  land: string | null;
  store: string | null;
  isCustom?: boolean;
}

interface StoreLocationPickerProps {
  value?: StoreLocation;
  onChange?: (location: StoreLocation) => void;
  label?: string;
  showLandSelector?: boolean;
  showStoreSelector?: boolean;
  required?: boolean;
  className?: string;
}

const CUSTOM_VALUE = '__custom__';

export function StoreLocationPicker({
  value,
  onChange,
  label = 'Location',
  showLandSelector = true,
  showStoreSelector = true,
  required = false,
  className = '',
}: StoreLocationPickerProps) {
  const [storeData, setStoreData] = useState<ParkStoresByLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCustomMode, setIsCustomMode] = useState(value?.isCustom || false);
  const [customLocation, setCustomLocation] = useState('');
  const [epicUniverseEnabled, setEpicUniverseEnabled] = useState(false);

  // Selected values
  const [selectedPark, setSelectedPark] = useState(value?.park || '');
  const [selectedLand, setSelectedLand] = useState(value?.land || '');
  const [selectedStore, setSelectedStore] = useState(value?.store || '');

  // Fetch store data and Epic Universe setting
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch park stores
        const storesRes = await fetch('/api/park-stores');
        if (storesRes.ok) {
          const data = await storesRes.json();
          setStoreData(data);
        }

        // Fetch Epic Universe setting
        const { data: settingData } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'epic_universe_enabled')
          .single();

        if (settingData?.value) {
          const enabled = typeof settingData.value === 'string'
            ? JSON.parse(settingData.value)
            : settingData.value;
          setEpicUniverseEnabled(enabled === true);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Update parent when selection changes
  const notifyChange = useCallback((park: string, land: string | null, store: string | null, custom = false) => {
    onChange?.({
      park,
      land: land || null,
      store: store || null,
      isCustom: custom,
    });
  }, [onChange]);

  // Handle park change
  const handleParkChange = (newPark: string) => {
    if (newPark === CUSTOM_VALUE) {
      setIsCustomMode(true);
      setSelectedPark('');
      setSelectedLand('');
      setSelectedStore('');
      return;
    }
    setSelectedPark(newPark);
    setSelectedLand('');
    setSelectedStore('');
    notifyChange(newPark, null, null);
  };

  // Handle land change
  const handleLandChange = (newLand: string) => {
    if (newLand === CUSTOM_VALUE) {
      setIsCustomMode(true);
      return;
    }
    setSelectedLand(newLand);
    setSelectedStore('');
    notifyChange(selectedPark, newLand, null);
  };

  // Handle store change
  const handleStoreChange = (newStore: string) => {
    if (newStore === CUSTOM_VALUE) {
      setIsCustomMode(true);
      return;
    }
    setSelectedStore(newStore);
    notifyChange(selectedPark, selectedLand, newStore);
  };

  // Handle custom location
  const handleCustomSubmit = () => {
    if (customLocation.trim()) {
      notifyChange(customLocation.trim(), null, null, true);
    }
  };

  // Exit custom mode
  const exitCustomMode = () => {
    setIsCustomMode(false);
    setCustomLocation('');
    setSelectedPark('');
    setSelectedLand('');
    setSelectedStore('');
    notifyChange('', null, null);
  };

  // Get available lands for selected park
  const availableLands = selectedPark && storeData?.landsByPark[selectedPark]
    ? storeData.landsByPark[selectedPark]
    : [];

  // Get available stores for selected park and land
  const availableStores = selectedPark && selectedLand && storeData?.storesByParkAndLand[selectedPark]?.[selectedLand]
    ? storeData.storesByParkAndLand[selectedPark][selectedLand]
    : [];

  if (loading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <Label>{label}</Label>
        <div className="animate-pulse h-10 bg-muted rounded-md" />
      </div>
    );
  }

  // Custom location mode
  if (isCustomMode) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <Label>{label}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={exitCustomMode}
            className="h-6 px-2 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Use Dropdown
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            type="text"
            value={customLocation}
            onChange={(e) => setCustomLocation(e.target.value)}
            onBlur={handleCustomSubmit}
            placeholder="Enter custom location (e.g., 'Magic Kingdom - Emporium')"
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Type a custom location if it&apos;s not in our database
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
      </div>

      {/* Park Selector */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Park</Label>
        <Select value={selectedPark} onValueChange={handleParkChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select a park..." />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Disney Parks</SelectLabel>
              {storeData?.parks
                .filter(p => p.startsWith('Disney') || p.startsWith('Magic') || p.startsWith('EPCOT') || p.startsWith('Hollywood') || p.startsWith('Animal'))
                .map(park => (
                  <SelectItem key={park} value={park}>
                    {park}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Universal Parks</SelectLabel>
              {storeData?.parks
                .filter(p => {
                  // Filter Universal parks, but only include Epic Universe if enabled
                  if (p.includes('Epic')) {
                    return epicUniverseEnabled;
                  }
                  return p.includes('Universal') || p.includes('Islands') || p.includes('CityWalk');
                })
                .map(park => (
                  <SelectItem key={park} value={park}>
                    {park}
                  </SelectItem>
                ))}
              {/* Show Epic Universe as Coming Soon when disabled */}
              {!epicUniverseEnabled && storeData?.parks.some(p => p.includes('Epic')) && (
                <SelectItem value="__epic_coming_soon__" disabled>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Epic Universe
                    <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                      Coming Soon
                    </span>
                  </span>
                </SelectItem>
              )}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Other Parks</SelectLabel>
              {storeData?.parks
                .filter(p => p.includes('SeaWorld') || p.includes('Busch') || p.includes('LEGOLAND'))
                .map(park => (
                  <SelectItem key={park} value={park}>
                    {park}
                  </SelectItem>
                ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>Other Options</SelectLabel>
              <SelectItem value={CUSTOM_VALUE}>
                <span className="flex items-center">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Custom Location
                </span>
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {/* Land/Area Selector */}
      {showLandSelector && selectedPark && availableLands.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Land / Area</Label>
          <Select value={selectedLand} onValueChange={handleLandChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select area..." />
            </SelectTrigger>
            <SelectContent>
              {availableLands.map(land => (
                <SelectItem key={land} value={land}>
                  {land}
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_VALUE}>
                <span className="flex items-center">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Custom Area
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Store Selector */}
      {showStoreSelector && selectedPark && selectedLand && availableStores.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Store</Label>
          <Select value={selectedStore} onValueChange={handleStoreChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select store..." />
            </SelectTrigger>
            <SelectContent>
              {availableStores.map(store => (
                <SelectItem key={store.id} value={store.store_name}>
                  <div className="flex flex-col">
                    <span>{store.store_name}</span>
                    {store.notes && (
                      <span className="text-xs text-muted-foreground">{store.notes}</span>
                    )}
                  </div>
                </SelectItem>
              ))}
              <SelectItem value={CUSTOM_VALUE}>
                <span className="flex items-center">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Custom Store
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Summary display */}
      {(selectedPark || selectedLand || selectedStore) && (
        <div className="text-sm bg-muted/50 rounded-md px-3 py-2">
          <span className="font-medium">Selected: </span>
          <span>
            {[selectedPark, selectedLand !== 'General' ? selectedLand : null, selectedStore]
              .filter(Boolean)
              .join(' > ')}
          </span>
        </div>
      )}
    </div>
  );
}

// Compact version for inline use
export function StoreLocationPickerCompact({
  value,
  onChange,
  placeholder = 'Select location...',
}: {
  value?: StoreLocation;
  onChange?: (location: StoreLocation) => void;
  placeholder?: string;
}) {
  const [storeData, setStoreData] = useState<ParkStoresByLocation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      try {
        const res = await fetch('/api/park-stores');
        if (res.ok) {
          const data = await res.json();
          setStoreData(data);
        }
      } catch (err) {
        console.error('Failed to fetch park stores:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStores();
  }, []);

  const formatLocation = (loc?: StoreLocation) => {
    if (!loc || !loc.park) return '';
    return [loc.park, loc.land, loc.store].filter(Boolean).join(' - ');
  };

  const handleChange = (fullValue: string) => {
    // Parse the combined value (park|land|store)
    const [park, land, store] = fullValue.split('|');
    onChange?.({
      park,
      land: land || null,
      store: store || null,
    });
  };

  if (loading) {
    return <div className="animate-pulse h-10 bg-muted rounded-md" />;
  }

  const currentValue = value?.park
    ? `${value.park}|${value.land || ''}|${value.store || ''}`
    : '';

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder}>
          {formatLocation(value)}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-80">
        {storeData?.parks.map(park => (
          <SelectGroup key={park}>
            <SelectLabel className="font-bold">{park}</SelectLabel>
            {storeData.landsByPark[park]?.map(land => (
              <SelectGroup key={`${park}-${land}`}>
                {land !== 'General' && (
                  <SelectLabel className="text-xs pl-4">{land}</SelectLabel>
                )}
                {storeData.storesByParkAndLand[park]?.[land]?.map(store => (
                  <SelectItem
                    key={store.id}
                    value={`${park}|${land}|${store.store_name}`}
                    className="pl-6"
                  >
                    {store.store_name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}
