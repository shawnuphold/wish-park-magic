/**
 * Google Cloud Vision API Integration
 *
 * Uses the Vision API REST endpoint with API key authentication
 * for label, text, web, and logo detection.
 */

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export interface VisionLabel {
  description: string;
  score: number;
}

export interface VisionText {
  text: string;
  locale?: string;
}

export interface VisionWebEntity {
  entityId: string;
  description: string;
  score: number;
}

export interface VisionWebPage {
  url: string;
  pageTitle?: string;
  score: number;
}

export interface VisionWebImage {
  url: string;
  score?: number;
}

export interface VisionLogo {
  description: string;
  score: number;
}

export interface VisionAnalysisResult {
  labels: VisionLabel[];
  text: VisionText[];
  fullText: string;
  webEntities: VisionWebEntity[];
  matchingPages: VisionWebPage[];
  matchingImages: VisionWebImage[];
  logos: VisionLogo[];
  error?: string;
}

/**
 * Analyze an image using Google Cloud Vision API
 * @param imageBase64 - Base64 encoded image data (without data URL prefix)
 */
export async function analyzeImage(imageBase64: string): Promise<VisionAnalysisResult> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

  if (!apiKey) {
    return {
      labels: [],
      text: [],
      fullText: '',
      webEntities: [],
      matchingPages: [],
      matchingImages: [],
      logos: [],
      error: 'GOOGLE_CLOUD_API_KEY not configured'
    };
  }

  // Remove data URL prefix if present
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const requestBody = {
    requests: [{
      image: {
        content: cleanBase64
      },
      features: [
        { type: 'LABEL_DETECTION', maxResults: 20 },
        { type: 'TEXT_DETECTION', maxResults: 10 },
        { type: 'WEB_DETECTION', maxResults: 10 },
        { type: 'LOGO_DETECTION', maxResults: 5 }
      ]
    }]
  };

  try {
    const response = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GoogleVision] API error:', response.status, errorText);
      return {
        labels: [],
        text: [],
        fullText: '',
        webEntities: [],
        matchingPages: [],
        matchingImages: [],
        logos: [],
        error: `Vision API error: ${response.status}`
      };
    }

    const data = await response.json();
    const result = data.responses?.[0];

    if (!result) {
      return {
        labels: [],
        text: [],
        fullText: '',
        webEntities: [],
        matchingPages: [],
        matchingImages: [],
        logos: [],
        error: 'No response from Vision API'
      };
    }

    // Parse labels
    const labels: VisionLabel[] = (result.labelAnnotations || []).map((l: any) => ({
      description: l.description,
      score: l.score
    }));

    // Parse text
    const textAnnotations = result.textAnnotations || [];
    const text: VisionText[] = textAnnotations.slice(1).map((t: any) => ({
      text: t.description,
      locale: t.locale
    }));
    const fullText = textAnnotations[0]?.description || '';

    // Parse web detection
    const webDetection = result.webDetection || {};
    const webEntities: VisionWebEntity[] = (webDetection.webEntities || [])
      .filter((e: any) => e.description)
      .map((e: any) => ({
        entityId: e.entityId || '',
        description: e.description,
        score: e.score || 0
      }));

    const matchingPages: VisionWebPage[] = (webDetection.pagesWithMatchingImages || [])
      .map((p: any) => ({
        url: p.url,
        pageTitle: p.pageTitle,
        score: p.score || 0
      }));

    const matchingImages: VisionWebImage[] = [
      ...(webDetection.fullMatchingImages || []),
      ...(webDetection.partialMatchingImages || [])
    ].map((i: any) => ({
      url: i.url,
      score: i.score
    }));

    // Parse logos
    const logos: VisionLogo[] = (result.logoAnnotations || []).map((l: any) => ({
      description: l.description,
      score: l.score
    }));

    console.log('[GoogleVision] Analysis complete:', {
      labels: labels.length,
      textBlocks: text.length,
      webEntities: webEntities.length,
      matchingPages: matchingPages.length,
      logos: logos.length
    });

    return {
      labels,
      text,
      fullText,
      webEntities,
      matchingPages,
      matchingImages,
      logos
    };

  } catch (error) {
    console.error('[GoogleVision] Error:', error);
    return {
      labels: [],
      text: [],
      fullText: '',
      webEntities: [],
      matchingPages: [],
      matchingImages: [],
      logos: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Extract theme park related information from Vision analysis
 */
export function extractParkContext(analysis: VisionAnalysisResult): {
  park: string | null;
  characters: string[];
  themes: string[];
  productType: string | null;
} {
  const park = detectPark(analysis);
  const characters = detectCharacters(analysis);
  const themes = detectThemes(analysis);
  const productType = detectProductType(analysis);

  return { park, characters, themes, productType };
}

function detectPark(analysis: VisionAnalysisResult): string | null {
  const parkKeywords: Record<string, string[]> = {
    'disney': ['disney', 'walt disney', 'mickey mouse', 'magic kingdom', 'epcot', 'hollywood studios', 'animal kingdom', 'disney springs'],
    'universal': ['universal', 'harry potter', 'hogwarts', 'wizarding world', 'islands of adventure', 'citywalk', 'nintendo'],
    'seaworld': ['seaworld', 'sea world', 'busch gardens', 'aquatica']
  };

  const allText = [
    ...analysis.labels.map(l => l.description),
    ...analysis.webEntities.map(e => e.description),
    ...analysis.logos.map(l => l.description),
    analysis.fullText
  ].join(' ').toLowerCase();

  for (const [park, keywords] of Object.entries(parkKeywords)) {
    if (keywords.some(kw => allText.includes(kw))) {
      return park;
    }
  }

  return null;
}

function detectCharacters(analysis: VisionAnalysisResult): string[] {
  const characterKeywords = [
    'mickey', 'minnie', 'donald', 'goofy', 'pluto', 'daisy',
    'stitch', 'lilo', 'simba', 'nala', 'timon', 'pumbaa',
    'elsa', 'anna', 'olaf', 'moana', 'maui',
    'woody', 'buzz', 'jessie', 'forky',
    'ariel', 'flounder', 'sebastian',
    'cinderella', 'aurora', 'belle', 'rapunzel',
    'figment', 'orange bird', 'pascal',
    'harry potter', 'hermione', 'ron',
    'mario', 'luigi', 'peach', 'yoshi', 'donkey kong',
    'grogu', 'baby yoda', 'mandalorian', 'darth vader'
  ];

  const allText = [
    ...analysis.labels.map(l => l.description),
    ...analysis.webEntities.map(e => e.description),
    analysis.fullText
  ].join(' ').toLowerCase();

  return characterKeywords.filter(char => allText.includes(char));
}

function detectThemes(analysis: VisionAnalysisResult): string[] {
  const themeKeywords = [
    'halloween', 'christmas', 'holiday', 'anniversary', '50th',
    'food and wine', 'flower and garden', 'festival',
    'spirit jersey', 'ears', 'ear headband', 'loungefly',
    'popcorn bucket', 'sipper', 'mug', 'tumbler',
    'pin', 'trading pin', 'mystery pin',
    'plush', 'stuffed animal', 'toy',
    'apparel', 'shirt', 't-shirt', 'hoodie', 'jacket',
    'bag', 'backpack', 'tote', 'purse',
    'magicband', 'magic band'
  ];

  const allText = [
    ...analysis.labels.map(l => l.description),
    ...analysis.webEntities.map(e => e.description),
    analysis.fullText
  ].join(' ').toLowerCase();

  return themeKeywords.filter(theme => allText.includes(theme));
}

function detectProductType(analysis: VisionAnalysisResult): string | null {
  const productTypes: Record<string, string[]> = {
    'jewelry': ['bracelet', 'charm bracelet', 'necklace', 'earrings', 'ring', 'jewelry', 'charm', 'pendant'],
    'popcorn_bucket': ['popcorn bucket', 'popcorn'],
    'sipper': ['sipper', 'cup', 'tumbler', 'drink container'],
    'ears': ['ears', 'ear headband', 'mickey ears', 'minnie ears'],
    'spirit_jersey': ['spirit jersey', 'jersey'],
    'loungefly': ['loungefly', 'mini backpack'],
    'plush': ['plush', 'stuffed', 'stuffed animal', 'plushie'],
    'pin': ['pin', 'trading pin', 'enamel pin'],
    'apparel': ['shirt', 't-shirt', 'hoodie', 'jacket', 'clothing'],
    'mug': ['mug', 'coffee mug', 'cup'],
    'magicband': ['magicband', 'magic band', 'magicband+'],
    'bag': ['bag', 'backpack', 'tote', 'purse', 'crossbody'],
    'ornament': ['ornament', 'christmas ornament'],
    'toy': ['toy', 'figure', 'figurine', 'action figure']
  };

  const allText = [
    ...analysis.labels.map(l => l.description),
    ...analysis.webEntities.map(e => e.description),
    analysis.fullText
  ].join(' ').toLowerCase();

  for (const [type, keywords] of Object.entries(productTypes)) {
    if (keywords.some(kw => allText.includes(kw))) {
      return type;
    }
  }

  return null;
}
