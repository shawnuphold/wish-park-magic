// Park Shopping Configuration
// Complete list of shopping locations for Orlando theme parks

export interface LocationConfig {
  id: string;
  dbValue: string;
  name: string;
  emoji: string;
  logo?: string;
}

export interface CategoryConfig {
  name: string;
  locations: LocationConfig[];
}

export interface ResortConfig {
  name: string;
  emoji: string;
  logo: string;
  categories: CategoryConfig[];
}

// Flatten parks for backwards compatibility
export interface ParkConfig extends LocationConfig {
  logo: string;
}

export const RESORTS: Record<string, ResortConfig> = {
  disney: {
    name: 'Walt Disney World',
    emoji: '🏰',
    logo: '/images/parks/disney-world.svg',
    categories: [
      {
        name: 'Theme Parks',
        locations: [
          { id: 'magic-kingdom', dbValue: 'disney_mk', name: 'Magic Kingdom', emoji: '🏰', logo: '/images/parks/magic-kingdom.svg' },
          { id: 'epcot', dbValue: 'disney_epcot', name: 'EPCOT', emoji: '🌍', logo: '/images/parks/epcot.svg' },
          { id: 'hollywood-studios', dbValue: 'disney_hs', name: 'Hollywood Studios', emoji: '🎬', logo: '/images/parks/hollywood-studios.svg' },
          { id: 'animal-kingdom', dbValue: 'disney_ak', name: 'Animal Kingdom', emoji: '🦁', logo: '/images/parks/animal-kingdom.svg' },
        ]
      },
      {
        name: 'Shopping & Entertainment',
        locations: [
          { id: 'disney-springs', dbValue: 'disney_springs', name: 'Disney Springs', emoji: '🛍️', logo: '/images/parks/disney-springs.svg' },
        ]
      },
      {
        name: 'Water Parks',
        locations: [
          { id: 'typhoon-lagoon', dbValue: 'disney_typhoon', name: 'Typhoon Lagoon', emoji: '🌊' },
          { id: 'blizzard-beach', dbValue: 'disney_blizzard', name: 'Blizzard Beach', emoji: '❄️' },
        ]
      },
      {
        name: 'Deluxe Resorts',
        locations: [
          { id: 'grand-floridian', dbValue: 'disney_resort_gf', name: 'Grand Floridian', emoji: '🏨' },
          { id: 'polynesian', dbValue: 'disney_resort_poly', name: 'Polynesian Village', emoji: '🌺' },
          { id: 'contemporary', dbValue: 'disney_resort_cr', name: 'Contemporary', emoji: '🏨' },
          { id: 'wilderness-lodge', dbValue: 'disney_resort_wl', name: 'Wilderness Lodge', emoji: '🌲' },
          { id: 'animal-kingdom-lodge', dbValue: 'disney_resort_akl', name: 'Animal Kingdom Lodge', emoji: '🦒' },
          { id: 'beach-club', dbValue: 'disney_resort_bc', name: 'Beach Club', emoji: '🏖️' },
          { id: 'yacht-club', dbValue: 'disney_resort_yc', name: 'Yacht Club', emoji: '⛵' },
          { id: 'boardwalk', dbValue: 'disney_resort_bw', name: 'BoardWalk Inn', emoji: '🎡' },
          { id: 'riviera', dbValue: 'disney_resort_rv', name: 'Riviera Resort', emoji: '🏨' },
        ]
      },
      {
        name: 'Moderate Resorts',
        locations: [
          { id: 'caribbean-beach', dbValue: 'disney_resort_cb', name: 'Caribbean Beach', emoji: '🏝️' },
          { id: 'coronado-springs', dbValue: 'disney_resort_cs', name: 'Coronado Springs', emoji: '🏨' },
          { id: 'port-orleans', dbValue: 'disney_resort_po', name: 'Port Orleans', emoji: '🎷' },
        ]
      },
      {
        name: 'Value Resorts',
        locations: [
          { id: 'art-of-animation', dbValue: 'disney_resort_aoa', name: 'Art of Animation', emoji: '🎨' },
          { id: 'pop-century', dbValue: 'disney_resort_pop', name: 'Pop Century', emoji: '📻' },
          { id: 'all-stars', dbValue: 'disney_resort_as', name: 'All-Star Resorts', emoji: '⭐' },
        ]
      }
    ]
  },
  universal: {
    name: 'Universal Orlando',
    emoji: '🎢',
    logo: '/images/parks/universal-orlando.svg',
    categories: [
      {
        name: 'Theme Parks',
        locations: [
          { id: 'usf', dbValue: 'universal_usf', name: 'Universal Studios', emoji: '🎬', logo: '/images/parks/universal-studios.svg' },
          { id: 'ioa', dbValue: 'universal_ioa', name: 'Islands of Adventure', emoji: '🦖', logo: '/images/parks/islands-of-adventure.svg' },
          { id: 'epic-universe', dbValue: 'universal_epic', name: 'Epic Universe', emoji: '🌟' },
        ]
      },
      {
        name: 'Water Parks',
        locations: [
          { id: 'volcano-bay', dbValue: 'universal_vb', name: 'Volcano Bay', emoji: '🌋' },
        ]
      },
      {
        name: 'Entertainment',
        locations: [
          { id: 'citywalk', dbValue: 'universal_citywalk', name: 'CityWalk', emoji: '🎵', logo: '/images/parks/citywalk.svg' },
        ]
      },
      {
        name: 'Premier Resorts',
        locations: [
          { id: 'hard-rock', dbValue: 'universal_resort_hr', name: 'Hard Rock Hotel', emoji: '🎸' },
          { id: 'portofino', dbValue: 'universal_resort_pb', name: 'Portofino Bay', emoji: '🇮🇹' },
          { id: 'royal-pacific', dbValue: 'universal_resort_rp', name: 'Royal Pacific', emoji: '🌴' },
        ]
      },
      {
        name: 'Prime Value Resorts',
        locations: [
          { id: 'cabana-bay', dbValue: 'universal_resort_cb', name: 'Cabana Bay', emoji: '🏖️' },
          { id: 'aventura', dbValue: 'universal_resort_av', name: 'Aventura Hotel', emoji: '🏨' },
          { id: 'endless-summer', dbValue: 'universal_resort_es', name: 'Endless Summer', emoji: '☀️' },
        ]
      }
    ]
  },
  seaworld: {
    name: 'SeaWorld Parks',
    emoji: '🐬',
    logo: '/images/parks/seaworld.svg',
    categories: [
      {
        name: 'Theme Parks',
        locations: [
          { id: 'seaworld', dbValue: 'seaworld', name: 'SeaWorld Orlando', emoji: '🐬', logo: '/images/parks/seaworld.svg' },
        ]
      },
      {
        name: 'Water Parks',
        locations: [
          { id: 'aquatica', dbValue: 'seaworld_aquatica', name: 'Aquatica', emoji: '🌊' },
        ]
      },
      {
        name: 'Experiences',
        locations: [
          { id: 'discovery-cove', dbValue: 'seaworld_discovery', name: 'Discovery Cove', emoji: '🐠' },
        ]
      }
    ]
  },
  venues: {
    name: 'Theaters & Venues',
    emoji: '🎭',
    logo: '/images/parks/venues.svg',
    categories: [
      {
        name: 'Movie Theaters',
        locations: [
          { id: 'amc-disney-springs', dbValue: 'theater_amc_ds', name: 'AMC Disney Springs 24', emoji: '🎬' },
          { id: 'cinemark-universal', dbValue: 'theater_cinemark', name: 'Universal Cinemark', emoji: '🎬' },
        ]
      },
      {
        name: 'Entertainment Venues',
        locations: [
          { id: 'cirque-du-soleil', dbValue: 'venue_cirque', name: 'Cirque du Soleil', emoji: '🎪' },
          { id: 'house-of-blues', dbValue: 'venue_hob', name: 'House of Blues', emoji: '🎵' },
        ]
      }
    ]
  },
  other: {
    name: 'Other Locations',
    emoji: '📍',
    logo: '/images/parks/other.svg',
    categories: [
      {
        name: 'Outlets & Shops',
        locations: [
          { id: 'character-warehouse', dbValue: 'other_outlet', name: 'Character Warehouse', emoji: '🏷️' },
          { id: 'orlando-airport', dbValue: 'other_mco', name: 'Orlando Airport (MCO)', emoji: '✈️' },
          { id: 'pin-traders', dbValue: 'other_pins', name: 'Pin Traders', emoji: '📌' },
        ]
      },
      {
        name: 'Online Stores',
        locations: [
          { id: 'shop-disney', dbValue: 'online_disney', name: 'shopDisney.com', emoji: '💻' },
          { id: 'shop-universal', dbValue: 'online_universal', name: 'Universal Shop', emoji: '💻' },
        ]
      }
    ]
  }
};

// Helper: Get all locations for a resort as flat array
export function getAllLocations(resortKey: string): LocationConfig[] {
  const resort = RESORTS[resortKey];
  if (!resort) return [];
  return resort.categories.flatMap(cat => cat.locations);
}

// Helper: Get location by slug (backwards compatible with old "parks" structure)
export function getParkBySlug(resortKey: string, locationSlug: string): ParkConfig | null {
  const resort = RESORTS[resortKey];
  if (!resort) return null;

  for (const category of resort.categories) {
    const location = category.locations.find(loc => loc.id === locationSlug);
    if (location) {
      return {
        ...location,
        logo: location.logo || resort.logo,
      };
    }
  }
  return null;
}

// Helper: Get all db values for a resort
export function getResortDbValues(resortKey: string): string[] {
  return getAllLocations(resortKey).map(loc => loc.dbValue);
}

// Helper: Get filter conditions for a specific location
export function getParkFilterValues(resortKey: string, locationSlug: string): string[] {
  const location = getParkBySlug(resortKey, locationSlug);
  if (!location) return [];

  // Include: specific location, generic resort, 'multiple'
  return [location.dbValue, resortKey, 'multiple'];
}

// Backwards compatibility: get parks array (flat list of all locations)
export function getParks(resortKey: string): ParkConfig[] {
  const resort = RESORTS[resortKey];
  if (!resort) return [];

  return resort.categories.flatMap(cat =>
    cat.locations.map(loc => ({
      ...loc,
      logo: loc.logo || resort.logo,
    }))
  );
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
