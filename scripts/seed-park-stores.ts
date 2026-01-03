/**
 * Seed Park Stores Database
 * Comprehensive list of merchandise locations at Orlando theme parks
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://jtqnjvczkywfkobwddbu.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0cW5qdmN6a3l3ZmtvYndkZGJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIwNTM4NiwiZXhwIjoyMDgxNzgxMzg2fQ.23QsahVizk_jI1h_bUY0-9duNHH3HmCX7WuZyzMgqak";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface ParkStore {
  park: string;
  land: string | null;
  store_name: string;
  store_type: 'gift_shop' | 'cart' | 'kiosk' | 'boutique' | 'resort';
  notes: string | null;
  sort_order: number;
}

const stores: ParkStore[] = [
  // ========================================
  // MAGIC KINGDOM
  // ========================================

  // Main Street U.S.A.
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'Emporium', store_type: 'gift_shop', notes: 'Largest store in park, spans entire block', sort_order: 1 },
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'Box Office Gifts', store_type: 'gift_shop', notes: 'Near Town Square Theater', sort_order: 2 },
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'Crystal Arts', store_type: 'boutique', notes: 'Glass and crystal collectibles', sort_order: 3 },
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'Uptown Jewelers', store_type: 'boutique', notes: 'Fine jewelry and Pandora', sort_order: 4 },
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'The Chapeau', store_type: 'boutique', notes: 'Hats and ear embroidery', sort_order: 5 },
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'Main Street Confectionery', store_type: 'gift_shop', notes: 'Candy and treats', sort_order: 6 },
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'Arribas Brothers', store_type: 'boutique', notes: 'Glass art and personalization', sort_order: 7 },
  { park: 'Magic Kingdom', land: 'Main Street U.S.A.', store_name: 'Main Street Cinema', store_type: 'gift_shop', notes: 'Classic Disney merch', sort_order: 8 },

  // Adventureland
  { park: 'Magic Kingdom', land: 'Adventureland', store_name: 'Adventureland Bazaar', store_type: 'gift_shop', notes: 'Main Adventureland store', sort_order: 10 },
  { park: 'Magic Kingdom', land: 'Adventureland', store_name: 'Island Supply', store_type: 'gift_shop', notes: 'Near Jungle Cruise', sort_order: 11 },
  { park: 'Magic Kingdom', land: 'Adventureland', store_name: 'Pirates Bazaar', store_type: 'gift_shop', notes: 'Exit of Pirates ride', sort_order: 12 },
  { park: 'Magic Kingdom', land: 'Adventureland', store_name: 'Zanzibar Trading Company', store_type: 'gift_shop', notes: 'Tiki Room area', sort_order: 13 },
  { park: 'Magic Kingdom', land: 'Adventureland', store_name: 'Agrabah Bazaar', store_type: 'gift_shop', notes: 'Aladdin merchandise', sort_order: 14 },

  // Frontierland
  { park: 'Magic Kingdom', land: 'Frontierland', store_name: 'Frontier Trading Post', store_type: 'gift_shop', notes: 'Main Frontierland store', sort_order: 20 },
  { park: 'Magic Kingdom', land: 'Frontierland', store_name: 'Big Al\'s', store_type: 'gift_shop', notes: 'Country Bears merchandise', sort_order: 21 },
  { park: 'Magic Kingdom', land: 'Frontierland', store_name: 'Prairie Outpost & Supply', store_type: 'gift_shop', notes: 'Western themed items', sort_order: 22 },
  { park: 'Magic Kingdom', land: 'Frontierland', store_name: 'Briar Patch', store_type: 'gift_shop', notes: 'Tiana\'s Bayou Adventure exit', sort_order: 23 },

  // Liberty Square
  { park: 'Magic Kingdom', land: 'Liberty Square', store_name: 'Memento Mori', store_type: 'boutique', notes: 'Haunted Mansion exclusive merchandise', sort_order: 30 },
  { park: 'Magic Kingdom', land: 'Liberty Square', store_name: 'Ye Olde Christmas Shoppe', store_type: 'boutique', notes: 'Year-round Christmas items', sort_order: 31 },
  { park: 'Magic Kingdom', land: 'Liberty Square', store_name: 'Liberty Square Portrait Gallery', store_type: 'boutique', notes: 'Silhouettes and portraits', sort_order: 32 },
  { park: 'Magic Kingdom', land: 'Liberty Square', store_name: 'Heritage House', store_type: 'gift_shop', notes: 'Americana and Muppets', sort_order: 33 },

  // Fantasyland
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Sir Mickey\'s', store_type: 'gift_shop', notes: 'In Cinderella Castle', sort_order: 40 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Castle Couture', store_type: 'boutique', notes: 'Princess merchandise', sort_order: 41 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Bibbidi Bobbidi Boutique', store_type: 'boutique', notes: 'Princess makeovers', sort_order: 42 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Fantasy Faire', store_type: 'gift_shop', notes: 'Near It\'s a Small World', sort_order: 43 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Seven Dwarfs Mine', store_type: 'gift_shop', notes: 'Exit of Seven Dwarfs Mine Train', sort_order: 44 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Big Top Souvenirs', store_type: 'gift_shop', notes: 'Storybook Circus, largest in Fantasyland', sort_order: 45 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Hundred Acre Goods', store_type: 'gift_shop', notes: 'Winnie the Pooh merchandise', sort_order: 46 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Bonjour! Village Gifts', store_type: 'gift_shop', notes: 'Beauty and the Beast area', sort_order: 47 },
  { park: 'Magic Kingdom', land: 'Fantasyland', store_name: 'Pooh\'s Thotful Shop', store_type: 'gift_shop', notes: 'Exit of Many Adventures of Winnie the Pooh', sort_order: 48 },

  // Tomorrowland
  { park: 'Magic Kingdom', land: 'Tomorrowland', store_name: 'Star Traders', store_type: 'gift_shop', notes: 'Large store near Space Mountain', sort_order: 50 },
  { park: 'Magic Kingdom', land: 'Tomorrowland', store_name: 'Tomorrowland Launch Depot', store_type: 'gift_shop', notes: 'Near Tron', sort_order: 51 },
  { park: 'Magic Kingdom', land: 'Tomorrowland', store_name: 'Mickey\'s Star Traders', store_type: 'gift_shop', notes: 'Space-themed merchandise', sort_order: 52 },
  { park: 'Magic Kingdom', land: 'Tomorrowland', store_name: 'Buzz Lightyear\'s Space Ranger Spin', store_type: 'gift_shop', notes: 'Exit of Buzz ride', sort_order: 53 },
  { park: 'Magic Kingdom', land: 'Tomorrowland', store_name: 'Merchant of Venus', store_type: 'gift_shop', notes: 'Stitch and alien merchandise', sort_order: 54 },

  // ========================================
  // EPCOT
  // ========================================

  // World Celebration
  { park: 'EPCOT', land: 'World Celebration', store_name: 'Creations Shop', store_type: 'gift_shop', notes: 'Main EPCOT store, largest merchandise selection', sort_order: 1 },
  { park: 'EPCOT', land: 'World Celebration', store_name: 'Pin Central', store_type: 'boutique', notes: 'Pin trading headquarters', sort_order: 2 },
  { park: 'EPCOT', land: 'World Celebration', store_name: 'Camera Center', store_type: 'boutique', notes: 'Photo services and accessories', sort_order: 3 },

  // World Discovery
  { park: 'EPCOT', land: 'World Discovery', store_name: 'Mission: SPACE Cargo Bay', store_type: 'gift_shop', notes: 'Exit of Mission: SPACE', sort_order: 10 },
  { park: 'EPCOT', land: 'World Discovery', store_name: 'Test Track Gift Shop', store_type: 'gift_shop', notes: 'Exit of Test Track', sort_order: 11 },
  { park: 'EPCOT', land: 'World Discovery', store_name: 'Guardians of the Galaxy Gift Shop', store_type: 'gift_shop', notes: 'Exit of Cosmic Rewind', sort_order: 12 },

  // World Nature
  { park: 'EPCOT', land: 'World Nature', store_name: 'The Land Cart', store_type: 'cart', notes: 'Figment and nature merchandise', sort_order: 20 },
  { park: 'EPCOT', land: 'World Nature', store_name: 'Sea Base Gift Shop', store_type: 'gift_shop', notes: 'Exit of Living Seas', sort_order: 21 },
  { park: 'EPCOT', land: 'World Nature', store_name: 'ImageWorks', store_type: 'gift_shop', notes: 'Figment merchandise', sort_order: 22 },
  { park: 'EPCOT', land: 'World Nature', store_name: 'Moana Gift Shop', store_type: 'gift_shop', notes: 'Exit of Journey of Water', sort_order: 23 },

  // World Showcase - Mexico
  { park: 'EPCOT', land: 'World Showcase - Mexico', store_name: 'Plaza de los Amigos', store_type: 'gift_shop', notes: 'Inside Mexico pyramid', sort_order: 30 },
  { park: 'EPCOT', land: 'World Showcase - Mexico', store_name: 'La Princesa de Cristal', store_type: 'boutique', notes: 'Glass and crystal items', sort_order: 31 },

  // World Showcase - Norway
  { park: 'EPCOT', land: 'World Showcase - Norway', store_name: 'The Puffin\'s Roost', store_type: 'gift_shop', notes: 'Norwegian goods and Frozen', sort_order: 35 },
  { park: 'EPCOT', land: 'World Showcase - Norway', store_name: 'The Fjording', store_type: 'gift_shop', notes: 'Exit of Frozen Ever After', sort_order: 36 },

  // World Showcase - China
  { park: 'EPCOT', land: 'World Showcase - China', store_name: 'House of Good Fortune', store_type: 'gift_shop', notes: 'Chinese merchandise and Mulan', sort_order: 40 },

  // World Showcase - Germany
  { park: 'EPCOT', land: 'World Showcase - Germany', store_name: 'Der Teddybär', store_type: 'boutique', notes: 'Steiff teddy bears', sort_order: 45 },
  { park: 'EPCOT', land: 'World Showcase - Germany', store_name: 'Das Kaufhaus', store_type: 'gift_shop', notes: 'German gifts and Snow White', sort_order: 46 },
  { park: 'EPCOT', land: 'World Showcase - Germany', store_name: 'Karamell-Küche', store_type: 'gift_shop', notes: 'Werther\'s caramels', sort_order: 47 },

  // World Showcase - Italy
  { park: 'EPCOT', land: 'World Showcase - Italy', store_name: 'Il Bel Cristallo', store_type: 'boutique', notes: 'Murano glass and Italian goods', sort_order: 50 },

  // World Showcase - America
  { park: 'EPCOT', land: 'World Showcase - America', store_name: 'Heritage Manor Gifts', store_type: 'gift_shop', notes: 'American-made products', sort_order: 55 },

  // World Showcase - Japan
  { park: 'EPCOT', land: 'World Showcase - Japan', store_name: 'Mitsukoshi Department Store', store_type: 'gift_shop', notes: 'Huge Japanese store, anime and traditional', sort_order: 60 },

  // World Showcase - Morocco
  { park: 'EPCOT', land: 'World Showcase - Morocco', store_name: 'The Brass Bazaar', store_type: 'gift_shop', notes: 'Moroccan crafts and lanterns', sort_order: 65 },
  { park: 'EPCOT', land: 'World Showcase - Morocco', store_name: 'Casablanca Carpets', store_type: 'boutique', notes: 'Rugs and textiles', sort_order: 66 },

  // World Showcase - France
  { park: 'EPCOT', land: 'World Showcase - France', store_name: 'Plume et Palette', store_type: 'gift_shop', notes: 'French goods and Ratatouille', sort_order: 70 },
  { park: 'EPCOT', land: 'World Showcase - France', store_name: 'La Signature', store_type: 'boutique', notes: 'Fine French cosmetics', sort_order: 71 },
  { park: 'EPCOT', land: 'World Showcase - France', store_name: 'Souvenirs de France', store_type: 'gift_shop', notes: 'Main France shop', sort_order: 72 },

  // World Showcase - UK
  { park: 'EPCOT', land: 'World Showcase - United Kingdom', store_name: 'The Crown & Crest', store_type: 'gift_shop', notes: 'British goods and royalty', sort_order: 75 },
  { park: 'EPCOT', land: 'World Showcase - United Kingdom', store_name: 'The Queen\'s Table', store_type: 'boutique', notes: 'Tea sets and tableware', sort_order: 76 },
  { park: 'EPCOT', land: 'World Showcase - United Kingdom', store_name: 'The Tea Caddy', store_type: 'gift_shop', notes: 'Twinings tea', sort_order: 77 },
  { park: 'EPCOT', land: 'World Showcase - United Kingdom', store_name: 'Sportsman\'s Shoppe', store_type: 'gift_shop', notes: 'UK sports memorabilia', sort_order: 78 },

  // World Showcase - Canada
  { park: 'EPCOT', land: 'World Showcase - Canada', store_name: 'Northwest Mercantile', store_type: 'gift_shop', notes: 'Canadian goods and maple products', sort_order: 80 },

  // ========================================
  // HOLLYWOOD STUDIOS
  // ========================================

  // Hollywood Boulevard
  { park: 'Hollywood Studios', land: 'Hollywood Boulevard', store_name: 'Keystone Clothiers', store_type: 'gift_shop', notes: 'Main store on boulevard', sort_order: 1 },
  { park: 'Hollywood Studios', land: 'Hollywood Boulevard', store_name: 'Mickey\'s of Hollywood', store_type: 'gift_shop', notes: 'Large character merchandise store', sort_order: 2 },
  { park: 'Hollywood Studios', land: 'Hollywood Boulevard', store_name: 'Celebrity 5 & 10', store_type: 'gift_shop', notes: 'Loungefly, Ears, Spirit Jerseys headquarters', sort_order: 3 },
  { park: 'Hollywood Studios', land: 'Hollywood Boulevard', store_name: 'Cover Story', store_type: 'gift_shop', notes: 'Near park entrance', sort_order: 4 },
  { park: 'Hollywood Studios', land: 'Hollywood Boulevard', store_name: 'Adrian & Edith\'s Head to Toe', store_type: 'boutique', notes: 'Accessories and fashion', sort_order: 5 },
  { park: 'Hollywood Studios', land: 'Hollywood Boulevard', store_name: 'Darkroom', store_type: 'boutique', notes: 'Photo services', sort_order: 6 },

  // Echo Lake
  { park: 'Hollywood Studios', land: 'Echo Lake', store_name: 'Indiana Jones Adventure Outpost', store_type: 'gift_shop', notes: 'Indiana Jones merchandise', sort_order: 10 },
  { park: 'Hollywood Studios', land: 'Echo Lake', store_name: 'Tatooine Traders', store_type: 'gift_shop', notes: 'Exit of Star Tours, Star Wars merch', sort_order: 11 },

  // Grand Avenue
  { park: 'Hollywood Studios', land: 'Grand Avenue', store_name: 'Stage 1 Company Store', store_type: 'gift_shop', notes: 'Near MuppetVision', sort_order: 15 },
  { park: 'Hollywood Studios', land: 'Grand Avenue', store_name: 'PizzeRizzo Merchandise', store_type: 'cart', notes: 'Muppet merchandise', sort_order: 16 },

  // Toy Story Land
  { park: 'Hollywood Studios', land: 'Toy Story Land', store_name: 'Woody\'s Lunchbox', store_type: 'cart', notes: 'Toy Story merchandise kiosk', sort_order: 20 },
  { park: 'Hollywood Studios', land: 'Toy Story Land', store_name: 'Jessie\'s Trading Post', store_type: 'gift_shop', notes: 'Exit of Slinky Dog Dash', sort_order: 21 },

  // Star Wars: Galaxy\'s Edge
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Dok-Ondar\'s Den of Antiquities', store_type: 'boutique', notes: 'High-end Star Wars collectibles, legacy lightsabers', sort_order: 25 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Savi\'s Workshop', store_type: 'boutique', notes: 'Build your own lightsaber', sort_order: 26 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Droid Depot', store_type: 'boutique', notes: 'Build your own droid', sort_order: 27 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'First Order Cargo', store_type: 'gift_shop', notes: 'First Order merchandise', sort_order: 28 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Resistance Supply', store_type: 'gift_shop', notes: 'Resistance merchandise', sort_order: 29 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Black Spire Outfitters', store_type: 'gift_shop', notes: 'Galaxy\'s Edge apparel', sort_order: 30 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Creature Stall', store_type: 'boutique', notes: 'Porgs and alien creatures', sort_order: 31 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Toydarian Toymaker', store_type: 'boutique', notes: 'Handcrafted toys and plush', sort_order: 32 },
  { park: 'Hollywood Studios', land: 'Galaxy\'s Edge', store_name: 'Jewels of Bith', store_type: 'boutique', notes: 'Kyber crystals and jewelry', sort_order: 33 },

  // Animation Courtyard
  { park: 'Hollywood Studios', land: 'Animation Courtyard', store_name: 'In Character', store_type: 'gift_shop', notes: 'Character meet and greet area shop', sort_order: 40 },
  { park: 'Hollywood Studios', land: 'Animation Courtyard', store_name: 'Launch Bay Cargo', store_type: 'gift_shop', notes: 'Star Wars Launch Bay exit', sort_order: 41 },

  // Sunset Boulevard
  { park: 'Hollywood Studios', land: 'Sunset Boulevard', store_name: 'Tower Hotel Gifts', store_type: 'gift_shop', notes: 'Tower of Terror exit', sort_order: 50 },
  { park: 'Hollywood Studios', land: 'Sunset Boulevard', store_name: 'Rock Around the Shop', store_type: 'gift_shop', notes: 'Rock \'n\' Roller Coaster exit', sort_order: 51 },
  { park: 'Hollywood Studios', land: 'Sunset Boulevard', store_name: 'Sunset Club Couture', store_type: 'boutique', notes: 'Villains and upscale merchandise', sort_order: 52 },
  { park: 'Hollywood Studios', land: 'Sunset Boulevard', store_name: 'Villains in Vogue', store_type: 'boutique', notes: 'Disney Villains merchandise', sort_order: 53 },
  { park: 'Hollywood Studios', land: 'Sunset Boulevard', store_name: 'Once Upon a Time', store_type: 'gift_shop', notes: 'Movie themed gifts', sort_order: 54 },

  // ========================================
  // ANIMAL KINGDOM
  // ========================================

  // Oasis
  { park: 'Animal Kingdom', land: 'Oasis', store_name: 'Garden Gate Gifts', store_type: 'gift_shop', notes: 'Near park entrance', sort_order: 1 },

  // Discovery Island
  { park: 'Animal Kingdom', land: 'Discovery Island', store_name: 'Island Mercantile', store_type: 'gift_shop', notes: 'Main park store near Tree of Life', sort_order: 5 },
  { park: 'Animal Kingdom', land: 'Discovery Island', store_name: 'Discovery Trading Company', store_type: 'gift_shop', notes: 'Large store with varied merchandise', sort_order: 6 },
  { park: 'Animal Kingdom', land: 'Discovery Island', store_name: 'Disney Outfitters', store_type: 'gift_shop', notes: 'Safari and outdoor themed apparel', sort_order: 7 },
  { park: 'Animal Kingdom', land: 'Discovery Island', store_name: 'Creature Comforts', store_type: 'gift_shop', notes: 'Plush and character items', sort_order: 8 },

  // Africa
  { park: 'Animal Kingdom', land: 'Africa', store_name: 'Mombasa Marketplace', store_type: 'gift_shop', notes: 'African crafts and Lion King', sort_order: 15 },
  { park: 'Animal Kingdom', land: 'Africa', store_name: 'Ziwani Traders', store_type: 'gift_shop', notes: 'Exit of Kilimanjaro Safaris', sort_order: 16 },

  // Asia
  { park: 'Animal Kingdom', land: 'Asia', store_name: 'Mandala Gifts', store_type: 'gift_shop', notes: 'Asian-inspired merchandise', sort_order: 20 },
  { park: 'Animal Kingdom', land: 'Asia', store_name: 'Serka Zong Bazaar', store_type: 'gift_shop', notes: 'Exit of Expedition Everest', sort_order: 21 },
  { park: 'Animal Kingdom', land: 'Asia', store_name: 'Bhaktapur Market', store_type: 'gift_shop', notes: 'Near Kali River Rapids', sort_order: 22 },

  // DinoLand U.S.A.
  { park: 'Animal Kingdom', land: 'DinoLand U.S.A.', store_name: 'Chester & Hester\'s Dinosaur Treasures', store_type: 'gift_shop', notes: 'Dinosaur and Pixar merchandise', sort_order: 25 },
  { park: 'Animal Kingdom', land: 'DinoLand U.S.A.', store_name: 'The Dino Institute Shop', store_type: 'gift_shop', notes: 'Exit of DINOSAUR ride', sort_order: 26 },

  // Pandora - The World of Avatar
  { park: 'Animal Kingdom', land: 'Pandora', store_name: 'Windtraders', store_type: 'gift_shop', notes: 'Main Avatar store, banshee adoption', sort_order: 30 },
  { park: 'Animal Kingdom', land: 'Pandora', store_name: 'ACE - Avatar Customization Experience', store_type: 'boutique', notes: 'Create your own Na\'vi action figure', sort_order: 31 },
  { park: 'Animal Kingdom', land: 'Pandora', store_name: 'Colors of Mo\'ara', store_type: 'cart', notes: 'Face painting and accessories', sort_order: 32 },

  // ========================================
  // DISNEY SPRINGS
  // ========================================

  // Marketplace
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'World of Disney', store_type: 'gift_shop', notes: 'Largest Disney store in the world', sort_order: 1 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'The Disney Corner', store_type: 'gift_shop', notes: 'Character merchandise', sort_order: 2 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Disney\'s Days of Christmas', store_type: 'boutique', notes: 'Year-round Christmas shop', sort_order: 3 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Disney\'s Pin Traders', store_type: 'boutique', notes: 'Pin trading HQ', sort_order: 4 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'The LEGO Store', store_type: 'gift_shop', notes: 'LEGO sets and exclusives', sort_order: 5 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Once Upon a Toy', store_type: 'gift_shop', notes: 'Toys and games', sort_order: 6 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Goofy\'s Candy Co.', store_type: 'gift_shop', notes: 'Candy and treats', sort_order: 7 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Tren-D', store_type: 'boutique', notes: 'Trendy fashion and accessories', sort_order: 8 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Disney\'s Wonderful World of Memories', store_type: 'boutique', notes: 'Scrapbooking and photo albums', sort_order: 9 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Marketplace Co-Op', store_type: 'gift_shop', notes: 'Multiple boutique shops in one', sort_order: 10 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Basin', store_type: 'boutique', notes: 'Bath and body products', sort_order: 11 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Arribas Brothers', store_type: 'boutique', notes: 'Glass and crystal art', sort_order: 12 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'The Art of Disney', store_type: 'boutique', notes: 'Disney artwork and collectibles', sort_order: 13 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Everything But Water', store_type: 'boutique', notes: 'Swimwear', sort_order: 14 },
  { park: 'Disney Springs', land: 'Marketplace', store_name: 'Bibbidi Bobbidi Boutique', store_type: 'boutique', notes: 'Princess makeovers', sort_order: 15 },

  // West Side
  { park: 'Disney Springs', land: 'West Side', store_name: 'Star Wars Galactic Outpost', store_type: 'gift_shop', notes: 'Star Wars merchandise', sort_order: 20 },
  { park: 'Disney Springs', land: 'West Side', store_name: 'D-Tech on Demand', store_type: 'boutique', notes: 'Customized merchandise', sort_order: 21 },
  { park: 'Disney Springs', land: 'West Side', store_name: 'Sugarboo & Co.', store_type: 'boutique', notes: 'Home goods and gifts', sort_order: 22 },
  { park: 'Disney Springs', land: 'West Side', store_name: 'Disney Style', store_type: 'boutique', notes: 'Fashion and accessories', sort_order: 23 },

  // ========================================
  // UNIVERSAL STUDIOS FLORIDA
  // ========================================

  // Production Central
  { park: 'Universal Studios', land: 'Production Central', store_name: 'Universal Studios Store', store_type: 'gift_shop', notes: 'Main park store near entrance', sort_order: 1 },
  { park: 'Universal Studios', land: 'Production Central', store_name: 'On Location', store_type: 'gift_shop', notes: 'Movie themed merchandise', sort_order: 2 },
  { park: 'Universal Studios', land: 'Production Central', store_name: 'Despicable Me Minion Mayhem', store_type: 'gift_shop', notes: 'Exit of Minion Mayhem ride', sort_order: 3 },
  { park: 'Universal Studios', land: 'Production Central', store_name: 'Shrek\'s Ye Olde Souvenir Shoppe', store_type: 'gift_shop', notes: 'Exit of Shrek 4-D', sort_order: 4 },
  { park: 'Universal Studios', land: 'Production Central', store_name: 'Transformers Supply Vault', store_type: 'gift_shop', notes: 'Exit of Transformers ride', sort_order: 5 },

  // New York
  { park: 'Universal Studios', land: 'New York', store_name: 'Sahara Traders', store_type: 'gift_shop', notes: 'Near Revenge of the Mummy', sort_order: 10 },
  { park: 'Universal Studios', land: 'New York', store_name: 'Rosie\'s Irish Shop', store_type: 'gift_shop', notes: 'Irish-themed merchandise', sort_order: 11 },

  // San Francisco
  { park: 'Universal Studios', land: 'San Francisco', store_name: 'San Francisco Candy Factory', store_type: 'gift_shop', notes: 'Candy and sweets', sort_order: 15 },

  // The Wizarding World - Diagon Alley
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Weasleys\' Wizard Wheezes', store_type: 'gift_shop', notes: 'Joke shop with Pygmy Puffs and pranks', sort_order: 20 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Ollivanders', store_type: 'boutique', notes: 'Interactive wands and wand experience', sort_order: 21 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Madam Malkin\'s Robes for All Occasions', store_type: 'boutique', notes: 'Hogwarts robes and apparel', sort_order: 22 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Wiseacre\'s Wizarding Equipment', store_type: 'gift_shop', notes: 'General Harry Potter merchandise', sort_order: 23 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Quality Quidditch Supplies', store_type: 'boutique', notes: 'Quidditch gear and brooms', sort_order: 24 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Magical Menagerie', store_type: 'boutique', notes: 'Plush creatures and pets', sort_order: 25 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Scribbulus', store_type: 'boutique', notes: 'Stationery and quills', sort_order: 26 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Borgin and Burkes', store_type: 'boutique', notes: 'Dark arts items in Knockturn Alley', sort_order: 27 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Shutterbutton\'s', store_type: 'boutique', notes: 'Photography shop', sort_order: 28 },
  { park: 'Universal Studios', land: 'Diagon Alley', store_name: 'Sugarplum\'s Sweet Shop', store_type: 'gift_shop', notes: 'Wizarding candy', sort_order: 29 },

  // World Expo
  { park: 'Universal Studios', land: 'World Expo', store_name: 'MIB Gear', store_type: 'gift_shop', notes: 'Exit of Men in Black', sort_order: 35 },

  // Springfield
  { park: 'Universal Studios', land: 'Springfield', store_name: 'Kwik-E-Mart', store_type: 'gift_shop', notes: 'Simpsons merchandise and snacks', sort_order: 40 },

  // Hollywood
  { park: 'Universal Studios', land: 'Hollywood', store_name: 'The Film Vault', store_type: 'gift_shop', notes: 'Universal movie merchandise', sort_order: 45 },
  { park: 'Universal Studios', land: 'Hollywood', store_name: 'Williams of Hollywood', store_type: 'gift_shop', notes: 'Props and collectibles', sort_order: 46 },
  { park: 'Universal Studios', land: 'Hollywood', store_name: 'Universal Legacy Store', store_type: 'gift_shop', notes: 'Classic Universal merchandise', sort_order: 47 },
  { park: 'Universal Studios', land: 'Hollywood', store_name: 'Hello Kitty Shop', store_type: 'boutique', notes: 'Hello Kitty merchandise', sort_order: 48 },

  // Woody Woodpecker\'s KidZone
  { park: 'Universal Studios', land: 'KidZone', store_name: 'E.T.\'s Toy Closet', store_type: 'gift_shop', notes: 'Exit of E.T. Adventure', sort_order: 50 },
  { park: 'Universal Studios', land: 'KidZone', store_name: 'SpongeBob StorePants', store_type: 'gift_shop', notes: 'SpongeBob merchandise', sort_order: 51 },

  // ========================================
  // ISLANDS OF ADVENTURE
  // ========================================

  // Port of Entry
  { park: 'Islands of Adventure', land: 'Port of Entry', store_name: 'Islands of Adventure Trading Company', store_type: 'gift_shop', notes: 'Main park store', sort_order: 1 },
  { park: 'Islands of Adventure', land: 'Port of Entry', store_name: 'Island Market and Export', store_type: 'gift_shop', notes: 'Near park entrance', sort_order: 2 },
  { park: 'Islands of Adventure', land: 'Port of Entry', store_name: 'DeFoto\'s Expedition Photography', store_type: 'boutique', notes: 'Photo services', sort_order: 3 },

  // Marvel Super Hero Island
  { park: 'Islands of Adventure', land: 'Marvel Super Hero Island', store_name: 'Marvel Alterniverse Store', store_type: 'gift_shop', notes: 'Main Marvel merchandise', sort_order: 10 },
  { park: 'Islands of Adventure', land: 'Marvel Super Hero Island', store_name: 'Spider-Man Shop', store_type: 'gift_shop', notes: 'Exit of Spider-Man ride', sort_order: 11 },
  { park: 'Islands of Adventure', land: 'Marvel Super Hero Island', store_name: 'Kingpin\'s Arcade', store_type: 'gift_shop', notes: 'Games and prizes', sort_order: 12 },

  // Toon Lagoon
  { park: 'Islands of Adventure', land: 'Toon Lagoon', store_name: 'Toon Extra', store_type: 'gift_shop', notes: 'Cartoon merchandise', sort_order: 15 },
  { park: 'Islands of Adventure', land: 'Toon Lagoon', store_name: 'Betty Boop Store', store_type: 'boutique', notes: 'Betty Boop merchandise', sort_order: 16 },

  // Skull Island
  { park: 'Islands of Adventure', land: 'Skull Island', store_name: 'Expedition Photo', store_type: 'cart', notes: 'King Kong photos and merchandise', sort_order: 20 },

  // Jurassic Park
  { park: 'Islands of Adventure', land: 'Jurassic Park', store_name: 'Jurassic Outfitters', store_type: 'gift_shop', notes: 'Main Jurassic merchandise', sort_order: 25 },
  { park: 'Islands of Adventure', land: 'Jurassic Park', store_name: 'Dinostore', store_type: 'gift_shop', notes: 'Dinosaur toys and plush', sort_order: 26 },
  { park: 'Islands of Adventure', land: 'Jurassic Park', store_name: 'Jurassic World VelociCoaster Gift Shop', store_type: 'gift_shop', notes: 'Exit of VelociCoaster', sort_order: 27 },

  // The Wizarding World - Hogsmeade
  { park: 'Islands of Adventure', land: 'Hogsmeade', store_name: 'Honeydukes', store_type: 'gift_shop', notes: 'Wizarding candy shop', sort_order: 30 },
  { park: 'Islands of Adventure', land: 'Hogsmeade', store_name: 'Zonko\'s Joke Shop', store_type: 'gift_shop', notes: 'Pranks and jokes', sort_order: 31 },
  { park: 'Islands of Adventure', land: 'Hogsmeade', store_name: 'Dervish and Banges', store_type: 'gift_shop', notes: 'General HP merchandise', sort_order: 32 },
  { park: 'Islands of Adventure', land: 'Hogsmeade', store_name: 'Ollivanders', store_type: 'boutique', notes: 'Wand shop and experience', sort_order: 33 },
  { park: 'Islands of Adventure', land: 'Hogsmeade', store_name: 'Owl Post', store_type: 'boutique', notes: 'Stationery and mail', sort_order: 34 },
  { park: 'Islands of Adventure', land: 'Hogsmeade', store_name: 'Filch\'s Emporium of Confiscated Goods', store_type: 'gift_shop', notes: 'Exit of Forbidden Journey', sort_order: 35 },
  { park: 'Islands of Adventure', land: 'Hogsmeade', store_name: 'Flight of the Hippogriff Gift Shop', store_type: 'gift_shop', notes: 'Exit of Hippogriff coaster', sort_order: 36 },

  // The Lost Continent
  { park: 'Islands of Adventure', land: 'Lost Continent', store_name: 'Treasures of Poseidon', store_type: 'gift_shop', notes: 'Mythical themed items', sort_order: 40 },
  { park: 'Islands of Adventure', land: 'Lost Continent', store_name: 'The Coin Mint', store_type: 'boutique', notes: 'Custom coins and medallions', sort_order: 41 },

  // Seuss Landing
  { park: 'Islands of Adventure', land: 'Seuss Landing', store_name: 'All The Books You Can Read', store_type: 'gift_shop', notes: 'Dr. Seuss books and merchandise', sort_order: 45 },
  { park: 'Islands of Adventure', land: 'Seuss Landing', store_name: 'Cats, Hats & Things', store_type: 'gift_shop', notes: 'Cat in the Hat merchandise', sort_order: 46 },
  { park: 'Islands of Adventure', land: 'Seuss Landing', store_name: 'Mulberry Street Store', store_type: 'gift_shop', notes: 'General Seuss items', sort_order: 47 },
  { park: 'Islands of Adventure', land: 'Seuss Landing', store_name: 'Snookers & Snookers Sweet Candy Cookers', store_type: 'gift_shop', notes: 'Candy shop', sort_order: 48 },

  // ========================================
  // CITYWALK
  // ========================================

  { park: 'CityWalk', land: null, store_name: 'Universal Studios Store', store_type: 'gift_shop', notes: 'Large store outside parks', sort_order: 1 },
  { park: 'CityWalk', land: null, store_name: 'Hart & Huntington Tattoo', store_type: 'boutique', notes: 'Tattoo parlor', sort_order: 2 },
  { park: 'CityWalk', land: null, store_name: 'Fresh Produce', store_type: 'boutique', notes: 'Casual clothing', sort_order: 3 },
  { park: 'CityWalk', land: null, store_name: 'PiQ', store_type: 'boutique', notes: 'Quirky gifts and novelties', sort_order: 4 },
  { park: 'CityWalk', land: null, store_name: 'Quiet Flight Surf Shop', store_type: 'boutique', notes: 'Surf and beach wear', sort_order: 5 },

  // ========================================
  // EPIC UNIVERSE (Coming 2025)
  // ========================================

  // Celestial Park
  { park: 'Epic Universe', land: 'Celestial Park', store_name: 'Epic Universe Store', store_type: 'gift_shop', notes: 'Main park store (Opening 2025)', sort_order: 1 },

  // Super Nintendo World
  { park: 'Epic Universe', land: 'Super Nintendo World', store_name: '1-UP Factory', store_type: 'gift_shop', notes: 'Mario and Nintendo merchandise', sort_order: 10 },

  // The Wizarding World - Ministry of Magic
  { park: 'Epic Universe', land: 'Ministry of Magic', store_name: 'Ministry Atrium Shop', store_type: 'gift_shop', notes: 'Harry Potter merchandise', sort_order: 15 },

  // Dark Universe
  { park: 'Epic Universe', land: 'Dark Universe', store_name: 'Dark Universe Gift Shop', store_type: 'gift_shop', notes: 'Classic monsters merchandise', sort_order: 20 },

  // How to Train Your Dragon
  { park: 'Epic Universe', land: 'Isle of Berk', store_name: 'Berk Gift Shop', store_type: 'gift_shop', notes: 'Dragon and Viking merchandise', sort_order: 25 },

  // ========================================
  // SEAWORLD ORLANDO
  // ========================================

  // Sea of Shallows / Entrance
  { park: 'SeaWorld', land: 'Entrance', store_name: 'SeaWorld Store', store_type: 'gift_shop', notes: 'Main park store near entrance', sort_order: 1 },
  { park: 'SeaWorld', land: 'Entrance', store_name: 'Shamu\'s Emporium', store_type: 'gift_shop', notes: 'Shamu and whale merchandise', sort_order: 2 },

  // Sea of Legends
  { park: 'SeaWorld', land: 'Sea of Legends', store_name: 'Kraken Gift Shop', store_type: 'gift_shop', notes: 'Exit of Kraken coaster', sort_order: 10 },
  { park: 'SeaWorld', land: 'Sea of Legends', store_name: 'Mako Shop', store_type: 'gift_shop', notes: 'Exit of Mako coaster', sort_order: 11 },

  // Sea of Delight
  { park: 'SeaWorld', land: 'Sea of Delight', store_name: 'Underwater Trading Company', store_type: 'gift_shop', notes: 'Ocean-themed merchandise', sort_order: 15 },

  // Sea of Ice
  { park: 'SeaWorld', land: 'Sea of Ice', store_name: 'Glacier Shop', store_type: 'gift_shop', notes: 'Near penguin exhibit', sort_order: 20 },
  { park: 'SeaWorld', land: 'Sea of Ice', store_name: 'Ice Breaker Shop', store_type: 'gift_shop', notes: 'Exit of Ice Breaker coaster', sort_order: 21 },

  // Sea of Fun
  { park: 'SeaWorld', land: 'Sea of Fun', store_name: 'Sesame Street Store', store_type: 'gift_shop', notes: 'Sesame Street merchandise', sort_order: 25 },

  // Sea of Power
  { park: 'SeaWorld', land: 'Sea of Power', store_name: 'Pipeline Gift Shop', store_type: 'gift_shop', notes: 'Exit of Pipeline coaster', sort_order: 30 },
];

async function seedStores() {
  console.log('Seeding park stores database...\n');

  // Clear existing stores
  const { error: deleteError } = await supabase
    .from('park_stores')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (deleteError) {
    console.error('Error clearing existing stores:', deleteError);
    return;
  }

  console.log('Cleared existing stores.\n');

  // Insert all stores
  const { data, error } = await supabase
    .from('park_stores')
    .insert(stores)
    .select();

  if (error) {
    console.error('Error inserting stores:', error);
    return;
  }

  console.log(`Successfully seeded ${data.length} park stores!\n`);

  // Summary by park
  const parkCounts: Record<string, number> = {};
  stores.forEach(s => {
    parkCounts[s.park] = (parkCounts[s.park] || 0) + 1;
  });

  console.log('Stores by park:');
  Object.entries(parkCounts).sort().forEach(([park, count]) => {
    console.log(`  ${park}: ${count} stores`);
  });
}

// Run the seeder
seedStores()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
