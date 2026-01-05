import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data: releases } = await supabase
    .from("new_releases")
    .select("id, image_url")
    .is("merged_into_id", null);

  const counts = { no_image: 0, placeholder: 0, s3_stored: 0, external_hotlink: 0 };
  const domains: Record<string, number> = {};

  for (const r of releases || []) {
    if (r.image_url === null || r.image_url === "") {
      counts.no_image++;
    } else if (r.image_url.includes("placeholder")) {
      counts.placeholder++;
    } else if (r.image_url.includes("s3.amazonaws") || r.image_url.includes("enchantedbucket")) {
      counts.s3_stored++;
    } else {
      counts.external_hotlink++;
      try {
        const domain = new URL(r.image_url).hostname;
        domains[domain] = (domains[domain] || 0) + 1;
      } catch {}
    }
  }

  console.log("Image Status:");
  console.log("  No image:", counts.no_image);
  console.log("  Placeholder:", counts.placeholder);
  console.log("  S3 stored:", counts.s3_stored);
  console.log("  External hotlink:", counts.external_hotlink);
  console.log("");
  console.log("External domains:");
  Object.entries(domains).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log("  " + c + "x " + d));
}

check();
