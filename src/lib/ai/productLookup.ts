/**
 * Product Lookup Orchestrator
 *
 * Combines Google Vision, Claude description, local database search,
 * and web search to identify theme park merchandise from images.
 */

import { analyzeImage, extractParkContext, type VisionAnalysisResult } from './googleVision';
import { describeProduct, type ProductDescription } from './describeProduct';
import { searchLocalDatabase, type LocalSearchResult } from './searchLocalDatabase';
import { searchProductArticles, type WebSearchResult } from './searchProductArticles';

export type LookupStep =
  | 'analyzing_image'
  | 'generating_description'
  | 'searching_database'
  | 'searching_web'
  | 'complete'
  | 'error';

export interface LookupProgress {
  step: LookupStep;
  message: string;
  details?: any;
}

export interface ProductLookupResult {
  // Source data
  visionAnalysis: VisionAnalysisResult | null;
  productDescription: ProductDescription | null;

  // Search results
  localMatch: LocalSearchResult | null;
  webResult: WebSearchResult | null;

  // Final product info
  product: {
    name: string;
    description: string;
    price: number | null;
    park: string | null;
    store: string | null;
    land: string | null;
    category: string;
    availability: string;
    characters: string[];
    themes: string[];
    imageUrl: string | null;
    sourceUrl: string | null;
    sourceType: 'local_database' | 'web_search' | 'ai_generated';
  } | null;

  // Meta
  confidence: number;
  steps: LookupProgress[];
  error: string | null;
}

export type ProgressCallback = (progress: LookupProgress) => void;

/**
 * Perform a full product lookup from an image
 *
 * @param imageBase64 - Base64 encoded image
 * @param onProgress - Optional callback for progress updates
 */
export async function lookupProduct(
  imageBase64: string,
  onProgress?: ProgressCallback
): Promise<ProductLookupResult> {
  const steps: LookupProgress[] = [];

  const addStep = (step: LookupStep, message: string, details?: any) => {
    const progress = { step, message, details };
    steps.push(progress);
    onProgress?.(progress);
    console.log(`[ProductLookup] ${step}: ${message}`);
  };

  try {
    // Step 1: Analyze image with Google Vision
    addStep('analyzing_image', 'Analyzing image with Google Vision...');
    const visionAnalysis = await analyzeImage(imageBase64);

    if (visionAnalysis.error) {
      addStep('error', `Vision API error: ${visionAnalysis.error}`);
    } else {
      const parkContext = extractParkContext(visionAnalysis);
      addStep('analyzing_image', 'Image analysis complete', {
        labels: visionAnalysis.labels.slice(0, 5).map(l => l.description),
        webEntities: visionAnalysis.webEntities.slice(0, 3).map(e => e.description),
        detectedPark: parkContext.park,
        characters: parkContext.characters,
        productType: parkContext.productType
      });
    }

    // Step 2: Generate detailed description with Claude
    addStep('generating_description', 'Generating product description...');
    const productDescription = await describeProduct(imageBase64, visionAnalysis);
    addStep('generating_description', `Identified: ${productDescription.name}`, {
      name: productDescription.name,
      productType: productDescription.productType,
      characters: productDescription.characters,
      confidence: productDescription.confidence
    });

    // Step 3: Search local database
    addStep('searching_database', 'Searching local database...');
    const localSearch = await searchLocalDatabase(productDescription, visionAnalysis);

    let localMatch: LocalSearchResult | null = null;
    if (localSearch.bestMatch) {
      localMatch = localSearch.bestMatch;
      addStep('searching_database', `Found local match: ${localMatch.title}`, {
        title: localMatch.title,
        confidence: localMatch.confidence,
        matchReason: localMatch.matchReason
      });
    } else if (localSearch.matches.length > 0) {
      addStep('searching_database', `Found ${localSearch.matches.length} potential matches (low confidence)`);
    } else {
      addStep('searching_database', 'No matches in local database');
    }

    // Step 4: Search web if no good local match
    let webResult: WebSearchResult | null = null;
    if (!localMatch || localMatch.confidence < 70) {
      addStep('searching_web', 'Searching web for product information...');
      webResult = await searchProductArticles(productDescription);

      if (webResult && webResult.confidence >= 50) {
        addStep('searching_web', `Found web result: ${webResult.name}`, {
          name: webResult.name,
          price: webResult.price,
          store: webResult.store,
          sourceUrl: webResult.sourceUrl
        });
      } else {
        addStep('searching_web', 'No confident web results found');
      }
    }

    // Compile final result
    const product = buildFinalProduct(productDescription, localMatch, webResult);
    const confidence = calculateOverallConfidence(productDescription, localMatch, webResult);

    addStep('complete', 'Product lookup complete', { confidence });

    return {
      visionAnalysis,
      productDescription,
      localMatch,
      webResult,
      product,
      confidence,
      steps,
      error: null
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    addStep('error', errorMessage);

    return {
      visionAnalysis: null,
      productDescription: null,
      localMatch: null,
      webResult: null,
      product: null,
      confidence: 0,
      steps,
      error: errorMessage
    };
  }
}

/**
 * Build the final product object from all sources
 */
function buildFinalProduct(
  description: ProductDescription,
  localMatch: LocalSearchResult | null,
  webResult: WebSearchResult | null
): ProductLookupResult['product'] {
  // Priority: local database > web search > AI description
  if (localMatch && localMatch.confidence >= 60) {
    return {
      name: localMatch.title,
      description: localMatch.description || description.description,
      price: localMatch.price_estimate,
      park: localMatch.park,
      store: localMatch.store_name,
      land: localMatch.store_area,
      category: localMatch.category,
      availability: 'available',
      characters: description.characters,
      themes: description.themes,
      imageUrl: localMatch.image_url,
      sourceUrl: localMatch.source_url,
      sourceType: 'local_database'
    };
  }

  if (webResult && webResult.confidence >= 50) {
    return {
      name: webResult.name,
      description: webResult.description || description.description,
      price: webResult.price,
      park: webResult.park,
      store: webResult.store,
      land: webResult.land,
      category: description.estimatedCategory,
      availability: webResult.availability,
      characters: description.characters,
      themes: description.themes,
      imageUrl: null,
      sourceUrl: webResult.sourceUrl,
      sourceType: 'web_search'
    };
  }

  // Fall back to AI-generated description
  return {
    name: description.name,
    description: description.description,
    price: null,
    park: description.estimatedPark,
    store: null,
    land: null,
    category: description.estimatedCategory,
    availability: 'unknown',
    characters: description.characters,
    themes: description.themes,
    imageUrl: null,
    sourceUrl: null,
    sourceType: 'ai_generated'
  };
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  description: ProductDescription,
  localMatch: LocalSearchResult | null,
  webResult: WebSearchResult | null
): number {
  // Weight the different sources
  const aiConfidence = description.confidence;
  const localConfidence = localMatch?.confidence || 0;
  const webConfidence = webResult?.confidence || 0;

  // Use highest confidence source, with bonuses for multiple sources agreeing
  let base = Math.max(aiConfidence, localConfidence, webConfidence);

  // Bonus if local and web agree
  if (localMatch && webResult && localMatch.confidence > 50 && webResult.confidence > 50) {
    const nameSimilarity = calculateNameSimilarity(localMatch.title, webResult.name);
    if (nameSimilarity > 0.7) {
      base = Math.min(base + 15, 100);
    }
  }

  return Math.round(base);
}

/**
 * Simple name similarity check
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const words1 = name1.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const words2 = name2.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  const overlap = words1.filter(w => words2.includes(w)).length;
  const total = Math.max(words1.length, words2.length);

  return total > 0 ? overlap / total : 0;
}
