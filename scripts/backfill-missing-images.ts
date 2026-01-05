import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { smartFetch } from "../src/lib/scraper/proxyFetch";
import { downloadAndStoreImage } from "../src/lib/images/releaseImages";
import * as cheerio from "cheerio";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function scrapeArticleImages(url: string): Promise<string[]> {
  try {
    console.log("[Scrape] Fetching:", url);
    const response = await smartFetch(url);
    if (!response.ok) {
      console.log("[Scrape] Failed:", response.status);
      return [];
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const images: string[] = [];
    
    // Check og:image first (usually high quality)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) {
      console.log("[Scrape] Found og:image");
      images.push(ogImage);
    }
    
    // Get article images
    $('article img, .entry-content img, .post-content img').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && !src.includes('avatar') && !src.includes('logo')) {
        const fullUrl = src.startsWith('http') ? src : new URL(src, url).href;
        if (!images.includes(fullUrl)) {
          images.push(fullUrl);
        }
      }
    });
    
    console.log("[Scrape] Found", images.length, "images");
    return images;
  } catch (error) {
    console.error("[Scrape] Error:", error);
    return [];
  }
}

async function backfill() {
  // Get releases without images
  const { data: releases } = await supabase
    .from("new_releases")
    .select("id, title, source_url")
    .or("image_url.is.null,image_url.eq.")
    .is("merged_into_id", null);

  console.log("Found", releases?.length || 0, "releases without images\n");

  for (const release of releases || []) {
    console.log("\n--- Processing:", release.title.slice(0, 50));
    
    if (!release.source_url) {
      console.log("No source URL, skipping");
      continue;
    }
    
    const images = await scrapeArticleImages(release.source_url);
    
    if (images.length > 0) {
      // Try to download and store the first good image
      const imageUrl = images[0];
      console.log("[S3] Downloading first image...");
      
      const s3Url = await downloadAndStoreImage(imageUrl, release.id, 'blog');
      
      if (s3Url) {
        console.log("[S3] Stored successfully");
        
        // Update the release
        const { error } = await supabase
          .from("new_releases")
          .update({ image_url: s3Url })
          .eq("id", release.id);
        
        if (error) {
          console.error("[DB] Update failed:", error);
        } else {
          console.log("[DB] Updated release with new image");
        }
      } else {
        console.log("[S3] Download failed");
      }
    } else {
      console.log("No images found in article");
    }
    
    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log("\n\nDone!");
}

backfill().catch(console.error);
