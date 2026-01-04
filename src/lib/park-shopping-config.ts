// Park Shopping Configuration
// Maps URL slugs to database values

export interface ParkConfig {
  id: string;
  dbValue: string;
  name: string;
  emoji: string;
}

export interface ResortConfig {
  name: string;
  emoji: string;
  parks: ParkConfig[];
}

export const RESORTS: Record<string, ResortConfig> = {
  disney: {
    name: 'Walt Disney World',
    emoji: '🏰',
    parks: [
      { id: 'magic-kingdom', dbValue: 'disney_mk', name: 'Magic Kingdom', emoji: '🏰' },
      { id: 'epcot', dbValue: 'disney_epcot', name: 'EPCOT', emoji: '🌍' },
      { id: 'hollywood-studios', dbValue: 'disney_hs', name: 'Hollywood Studios', emoji: '🎬' },
      { id: 'animal-kingdom', dbValue: 'disney_ak', name: 'Animal Kingdom', emoji: '🦁' },
      { id: 'disney-springs', dbValue: 'disney_springs', name: 'Disney Springs', emoji: '🛍️' },
    ],
  },
  universal: {
    name: 'Universal Orlando',
    emoji: '🎢',
    parks: [
      { id: 'usf', dbValue: 'universal_usf', name: 'Universal Studios', emoji: '🎬' },
      { id: 'ioa', dbValue: 'universal_ioa', name: 'Islands of Adventure', emoji: '🦖' },
      { id: 'citywalk', dbValue: 'universal_citywalk', name: 'CityWalk', emoji: '🎵' },
      { id: 'epic-universe', dbValue: 'universal_epic', name: 'Epic Universe', emoji: '🌟' },
    ],
  },
  seaworld: {
    name: 'SeaWorld Orlando',
    emoji: '🐬',
    parks: [
      { id: 'seaworld', dbValue: 'seaworld', name: 'SeaWorld', emoji: '🐬' },
    ],
  },
};

// Get park config by URL slug
export function getParkBySlug(resort: string, parkSlug: string): ParkConfig | null {
  const resortConfig = RESORTS[resort];
  if (!resortConfig) return null;
  return resortConfig.parks.find(p => p.id === parkSlug) || null;
}

// Get all db values for a resort (for querying items that match the resort)
export function getResortDbValues(resort: string): string[] {
  const resortConfig = RESORTS[resort];
  if (!resortConfig) return [];
  return resortConfig.parks.map(p => p.dbValue);
}

// Get filter conditions for a specific park
// Returns array of park values to match (includes generic park and 'multiple')
export function getParkFilterValues(resort: string, parkSlug: string): string[] {
  const park = getParkBySlug(resort, parkSlug);
  if (!park) return [];

  // Include the specific park, the generic resort, 'multiple', and null
  const values = [park.dbValue, resort, 'multiple'];
  return values;
}

// Item status type
export type ItemStatus = 'pending' | 'found' | 'not_found' | 'substituted';

// Not found reasons
export const NOT_FOUND_REASONS = [
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'cant_find', label: "Can't Find" },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'wrong_park', label: 'Wrong Park' },
] as const;

export type NotFoundReason = typeof NOT_FOUND_REASONS[number]['value'];
