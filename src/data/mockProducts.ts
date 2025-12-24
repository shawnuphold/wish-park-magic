// Mock product data for static frontend display
export interface Product {
  id: string;
  title: string;
  description: string | null;
  park: 'disney' | 'universal' | 'seaworld';
  category: string;
  image_url: string;
  source_url: string;
  source: string;
  price_estimate: number | null;
  release_date: string;
  is_limited_edition: boolean;
  location_info: string | null;
}

export const mockProducts: Product[] = [
  {
    id: '1',
    title: 'Mickey Mouse Spirit Jersey - Coral Reef',
    description: 'Beautiful coral-colored Spirit Jersey featuring classic Mickey Mouse embroidery. Soft, lightweight fabric perfect for Florida weather.',
    park: 'disney',
    category: 'spirit-jerseys',
    image_url: 'https://images.unsplash.com/photo-1563396983906-b3795482a59a?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'Disney Parks Blog',
    price_estimate: 74.99,
    release_date: '2024-12-20',
    is_limited_edition: false,
    location_info: 'Available at World of Disney, Disney Springs',
  },
  {
    id: '2',
    title: 'Haunted Mansion Loungefly Backpack',
    description: 'Spooky-cute Loungefly mini backpack featuring the iconic Haunted Mansion wallpaper pattern with glow-in-the-dark details.',
    park: 'disney',
    category: 'loungefly',
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'WDW News Today',
    price_estimate: 90.00,
    release_date: '2024-12-18',
    is_limited_edition: true,
    location_info: 'Memento Mori, Magic Kingdom',
  },
  {
    id: '3',
    title: 'Butterbeer Popcorn Bucket',
    description: 'Limited edition popcorn bucket shaped like a foaming mug of Butterbeer. Refillable at any popcorn stand in the Wizarding World.',
    park: 'universal',
    category: 'popcorn-buckets',
    image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'Universal Parks Blog',
    price_estimate: 25.00,
    release_date: '2024-12-15',
    is_limited_edition: true,
    location_info: 'Wizarding World of Harry Potter, Islands of Adventure',
  },
  {
    id: '4',
    title: 'EPCOT Festival of the Arts Ears',
    description: 'Artist palette-inspired Mickey ears featuring colorful paint splatters and a rainbow headband.',
    park: 'disney',
    category: 'ears',
    image_url: 'https://images.unsplash.com/photo-1609372332255-611485350f25?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'Disney Parks Blog',
    price_estimate: 39.99,
    release_date: '2024-12-12',
    is_limited_edition: false,
    location_info: 'Available at various EPCOT locations during festival',
  },
  {
    id: '5',
    title: 'Hogwarts Castle Pin Set',
    description: 'Collectible pin set featuring all four Hogwarts houses plus a detailed castle pin. Comes in special collector\'s box.',
    park: 'universal',
    category: 'pins',
    image_url: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'Inside Universal',
    price_estimate: 29.99,
    release_date: '2024-12-10',
    is_limited_edition: false,
    location_info: 'Filch\'s Emporium, Islands of Adventure',
  },
  {
    id: '6',
    title: 'Shamu 60th Anniversary Plush',
    description: 'Commemorative large plush celebrating SeaWorld Orlando\'s beloved orca. Special anniversary edition with golden details.',
    park: 'seaworld',
    category: 'plush',
    image_url: 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'SeaWorld Parks Blog',
    price_estimate: 34.99,
    release_date: '2024-12-08',
    is_limited_edition: true,
    location_info: 'SeaWorld Orlando main gift shop',
  },
  {
    id: '7',
    title: 'Star Wars Galaxy\'s Edge Thermal Detonator Mug',
    description: 'Detailed replica thermal detonator that doubles as an insulated drink container. Includes lid.',
    park: 'disney',
    category: 'drinkware',
    image_url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'Disney Parks Blog',
    price_estimate: 32.99,
    release_date: '2024-12-05',
    is_limited_edition: false,
    location_info: 'Docking Bay 7, Galaxy\'s Edge',
  },
  {
    id: '8',
    title: 'Jurassic World Raptor Figurine',
    description: 'Highly detailed Blue the Velociraptor figurine from Jurassic World. Poseable with realistic paint details.',
    park: 'universal',
    category: 'figurines',
    image_url: 'https://images.unsplash.com/photo-1619468129361-605ebea04b44?w=600&h=600&fit=crop',
    source_url: 'https://example.com',
    source: 'Universal Parks Blog',
    price_estimate: 49.99,
    release_date: '2024-12-01',
    is_limited_edition: false,
    location_info: 'Jurassic Outfitters, Islands of Adventure',
  },
];
