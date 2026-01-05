/**
 * Product Lookup Orchestrator
 *
 * Combines SerpApi Google Lens, Google Vision, Claude description,
 * local database search, and web search to identify theme park merchandise.
 */

import { analyzeImage, extractParkContext, type VisionAnalysisResult } from './googleVision';
import { describeProduct, type ProductDescription } from './describeProduct';
import { searchLocalDatabase, type LocalSearchResult } from './searchLocalDatabase';
import { searchProductArticles, type WebSearchResult } from './searchProductArticles';
import { searchGoogleLens, findDisneyMatch, findDisneyArticleUrl, extractProductName, type LensMatch } from './googleLens';
import { extractProductFromArticle, type ExtractedProductInfo } from './extractProductFromArticle';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export type LookupStep =
  | 'fetching_settings'
  | 'searching_lens'
  | 'extracting_article'
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
  lensMatch: LensMatch | null;
  visionAnalysis: VisionAnalysisResult | null;
  productDescription: ProductDescription | null;
  articleProduct: ExtractedProductInfo | null;

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
    sourceType: 'google_lens' | 'local_database' | 'web_search' | 'ai_generated';
  } | null;

  // Meta
  confidence: number;
  steps: LookupProgress[];
  error: string | null;
}

export type ProgressCallback = (progress: LookupProgress) => void;

interface LookupSettings {
  provider: 'serpapi' | 'google_vision' | 'claude_only';
  googleVisionEnabled: boolean;
  claudeFallbackEnabled: boolean;
}

/**
 * Fetch product lookup settings from database
 */
async function getSettings(): Promise<LookupSettings> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['product_lookup_provider', 'google_vision_enabled', 'claude_fallback_enabled']);

    const settingsMap: Record<string, string> = {};
    for (const s of settings || []) {
      settingsMap[s.key] = s.value;
    }

    return {
      provider: (settingsMap.product_lookup_provider?.replace(/"/g, '') || 'serpapi') as LookupSettings['provider'],
      googleVisionEnabled: settingsMap.google_vision_enabled === 'true',
      claudeFallbackEnabled: settingsMap.claude_fallback_enabled !== 'false'
    };
  } catch (error) {
    console.error('[ProductLookup] Failed to fetch settings:', error);
    return { provider: 'serpapi', googleVisionEnabled: true, claudeFallbackEnabled: true };
  }
}

/**
 * Perform a full product lookup from an image
 *
 * @param imageBase64 - Base64 encoded image (or data URL)
 * @param imageUrl - Optional public URL of the image (required for SerpApi)
 * @param onProgress - Optional callback for progress updates
 */
export async function lookupProduct(
  imageBase64: string,
  imageUrl?: string,
  onProgress?: ProgressCallback
): Promise<ProductLookupResult> {
  const steps: LookupProgress[] = [];
  let lensMatch: LensMatch | null = null;
  let visionAnalysis: VisionAnalysisResult | null = null;
  let productDescription: ProductDescription | null = null;
  let articleProduct: ExtractedProductInfo | null = null;
  let localMatch: LocalSearchResult | null = null;
  let webResult: WebSearchResult | null = null;

  const addStep = (step: LookupStep, message: string, details?: any) => {
    const progress = { step, message, details };
    steps.push(progress);
    onProgress?.(progress);
    console.log(`[ProductLookup] ${step}: ${message}`);
  };

  try {
    // Step 0: Fetch settings
    addStep('fetching_settings', 'Loading configuration...');
    const settings = await getSettings();
    addStep('fetching_settings', `Provider: ${settings.provider}`);

    // Step 1: Try SerpApi Google Lens (if configured and we have a URL)
    if (settings.provider === 'serpapi' && imageUrl) {
      console.log('[ProductLookup] Using SerpApi with URL:', imageUrl);
      addStep('searching_lens', 'Searching with Google Lens...');
      const lensResult = await searchGoogleLens(imageUrl);

      console.log('[ProductLookup] Lens result:', {
        success: lensResult.success,
        matchCount: lensResult.visualMatches.length,
        error: lensResult.error
      });

      if (lensResult.success && lensResult.visualMatches.length > 0) {
        lensMatch = findDisneyMatch(lensResult.visualMatches);
        if (lensMatch) {
          const productName = extractProductName(lensMatch);
          console.log('[ProductLookup] Best Disney match:', productName, 'from', lensMatch.source);
          addStep('searching_lens', `Found: ${productName}`, {
            title: productName,
            source: lensMatch.source,
            price: lensMatch.price?.value,
            link: lensMatch.link,
            usage: lensResult.usageInfo
          });
        }

        // Try to find a Disney blog article for more accurate product info
        const articleUrl = findDisneyArticleUrl(lensResult.visualMatches);
        if (articleUrl) {
          addStep('extracting_article', `Fetching article: ${articleUrl.substring(0, 50)}...`);
          try {
            const articleResult = await extractProductFromArticle(articleUrl);
            if (articleResult.success && articleResult.product) {
              articleProduct = articleResult.product;
              console.log('[ProductLookup] Extracted from article:', articleProduct.productName);
              addStep('extracting_article', `Extracted: ${articleProduct.productName}`, {
                name: articleProduct.productName,
                price: articleProduct.price,
                location: articleProduct.location,
                sourceUrl: articleUrl
              });
            } else {
              addStep('extracting_article', `Article extraction failed: ${articleResult.error || 'Unknown error'}`);
            }
          } catch (articleError) {
            console.error('[ProductLookup] Article extraction error:', articleError);
            addStep('extracting_article', `Article fetch failed: ${articleError instanceof Error ? articleError.message : 'Unknown error'}`);
          }
        }
      } else if (lensResult.error === 'Monthly limit reached') {
        addStep('searching_lens', 'SerpApi limit reached, falling back...', lensResult.usageInfo);
      } else if (lensResult.error) {
        addStep('searching_lens', `Lens error: ${lensResult.error}`);
      } else {
        addStep('searching_lens', 'No visual matches found');
      }
    } else {
      console.log('[ProductLookup] Skipping SerpApi:', { provider: settings.provider, hasUrl: !!imageUrl });
    }

    // Step 2: Try Google Vision (if lens failed or not primary, and enabled)
    const shouldUseVision =
      (settings.provider === 'google_vision') ||
      (settings.googleVisionEnabled && !lensMatch);

    if (shouldUseVision) {
      addStep('analyzing_image', 'Analyzing image with Google Vision...');
      visionAnalysis = await analyzeImage(imageBase64);

      if (visionAnalysis.error) {
        addStep('analyzing_image', `Vision API error: ${visionAnalysis.error}`);
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
    }

    // Step 3: Generate description with Claude (if enabled or needed for database search)
    const shouldUseClaude =
      settings.claudeFallbackEnabled ||
      settings.provider === 'claude_only' ||
      !lensMatch;

    if (shouldUseClaude) {
      addStep('generating_description', 'Generating product description...');
      productDescription = await describeProduct(imageBase64, visionAnalysis);
      addStep('generating_description', `Identified: ${productDescription.name}`, {
        name: productDescription.name,
        productType: productDescription.productType,
        characters: productDescription.characters,
        confidence: productDescription.confidence
      });

      // Step 4: Search local database
      addStep('searching_database', 'Searching local database...');
      const localSearch = await searchLocalDatabase(productDescription, visionAnalysis);

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

      // Step 5: Search web if no good match yet
      if (!lensMatch && (!localMatch || localMatch.confidence < 70)) {
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
    }

    // Compile final result
    const product = buildFinalProduct(lensMatch, articleProduct, productDescription, localMatch, webResult);
    const confidence = calculateOverallConfidence(lensMatch, articleProduct, productDescription, localMatch, webResult);

    addStep('complete', 'Product lookup complete', { confidence });

    return {
      lensMatch,
      visionAnalysis,
      productDescription,
      articleProduct,
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
      lensMatch: null,
      visionAnalysis: null,
      productDescription: null,
      articleProduct: null,
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
  lensMatch: LensMatch | null,
  articleProduct: ExtractedProductInfo | null,
  description: ProductDescription | null,
  localMatch: LocalSearchResult | null,
  webResult: WebSearchResult | null
): ProductLookupResult['product'] {
  // Priority: Article extraction > Google Lens > local database > web search > AI description

  // If we extracted product info from a Disney blog article, use it (most accurate)
  if (articleProduct) {
    return {
      name: articleProduct.productName,
      description: articleProduct.description || `Found via Disney blog article`,
      price: articleProduct.price || null,
      park: articleProduct.location?.toLowerCase().includes('disney') ? 'disney' : null,
      store: articleProduct.location || null,
      land: null,
      category: articleProduct.category || description?.estimatedCategory || 'merchandise',
      availability: articleProduct.isLimitedEdition ? 'limited' : 'available',
      characters: description?.characters || [],
      themes: description?.themes || [],
      imageUrl: lensMatch?.thumbnail || null,
      sourceUrl: lensMatch?.link || null,
      sourceType: 'google_lens'
    };
  }

  // If we have a lens match but no article, use the lens match
  if (lensMatch) {
    const productName = extractProductName(lensMatch);
    return {
      name: productName,
      description: `Found via Google Lens on ${lensMatch.source}`,
      price: lensMatch.price?.extracted_value || null,
      park: null,
      store: null,
      land: null,
      category: description?.estimatedCategory || 'merchandise',
      availability: 'unknown',
      characters: description?.characters || [],
      themes: description?.themes || [],
      imageUrl: lensMatch.thumbnail || null,
      sourceUrl: lensMatch.link,
      sourceType: 'google_lens'
    };
  }

  // Local database match
  if (localMatch && localMatch.confidence >= 75) {
    return {
      name: localMatch.title,
      description: localMatch.description || description?.description || '',
      price: localMatch.price_estimate,
      park: localMatch.park,
      store: localMatch.store_name,
      land: localMatch.store_area,
      category: localMatch.category,
      availability: 'available',
      characters: description?.characters || [],
      themes: description?.themes || [],
      imageUrl: localMatch.image_url,
      sourceUrl: localMatch.source_url,
      sourceType: 'local_database'
    };
  }

  // Web search result
  if (webResult && webResult.confidence >= 50) {
    return {
      name: webResult.name,
      description: webResult.description || description?.description || '',
      price: webResult.price,
      park: webResult.park,
      store: webResult.store,
      land: webResult.land,
      category: description?.estimatedCategory || 'merchandise',
      availability: webResult.availability,
      characters: description?.characters || [],
      themes: description?.themes || [],
      imageUrl: null,
      sourceUrl: webResult.sourceUrl,
      sourceType: 'web_search'
    };
  }

  // Fall back to AI-generated description
  if (description) {
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

  // No result available
  return null;
}

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(
  lensMatch: LensMatch | null,
  articleProduct: ExtractedProductInfo | null,
  description: ProductDescription | null,
  localMatch: LocalSearchResult | null,
  webResult: WebSearchResult | null
): number {
  // Article extraction from Disney blog = highest confidence
  if (articleProduct) {
    // We successfully extracted product info from a trusted source
    return 98;
  }

  // Google Lens matches are highly confident
  if (lensMatch) {
    // If lens found it on a Disney blog/ShopDisney, very high confidence
    const trustedSources = ['wdwnt.com', 'blogmickey.com', 'disneyfoodblog.com', 'shopdisney.com'];
    const isTrusted = trustedSources.some(s => lensMatch.link?.includes(s));
    return isTrusted ? 95 : 85;
  }

  // Weight the different sources
  const aiConfidence = description?.confidence || 0;
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
