/**
 * Release Notification Email Template
 *
 * HTML email template for notifying customers about new releases.
 */

import type { Park, ItemCategory } from '@/lib/database.types';

interface ReleaseData {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  park: Park;
  category: ItemCategory;
  price_estimate: number | null;
  is_limited_edition: boolean;
  park_exclusive: boolean;
}

interface TemplateData {
  customerName: string;
  releases: ReleaseData[];
}

const PARK_NAMES: Record<Park, string> = {
  disney: 'Walt Disney World',
  universal: 'Universal Orlando',
  seaworld: 'SeaWorld Orlando',
};

const CATEGORY_NAMES: Record<ItemCategory, string> = {
  plush: 'Plush',
  pins: 'Pins',
  spirit_jersey: 'Spirit Jersey',
  loungefly: 'Loungefly',
  apparel: 'Apparel',
  home_decor: 'Home & Decor',
  ears: 'Ears',
  collectible: 'Collectible',
  popcorn_bucket: 'Popcorn Bucket',
  drinkware: 'Drinkware',
  toys: 'Toys',
  jewelry: 'Jewelry',
  other: 'Other',
};

export function generateSubject(releases: ReleaseData[]): string {
  if (releases.length === 1) {
    const release = releases[0];
    const prefix = release.park_exclusive ? 'Park Exclusive: ' : '';
    return `${prefix}New ${CATEGORY_NAMES[release.category]} at ${PARK_NAMES[release.park]}!`;
  }
  return `${releases.length} New Releases Just Dropped!`;
}

export function generateEmailHtml({ customerName, releases }: TemplateData): string {
  const releaseCards = releases.map(release => `
    <div style="background: #ffffff; border-radius: 12px; margin-bottom: 20px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      ${release.image_url ? `
        <img src="${release.image_url}" alt="${release.title}" style="width: 100%; height: 200px; object-fit: cover;" />
      ` : ''}
      <div style="padding: 20px;">
        <div style="margin-bottom: 8px;">
          ${release.park_exclusive ? `
            <span style="display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #1a1a1a; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; margin-right: 8px;">
              Park Exclusive
            </span>
          ` : ''}
          ${release.is_limited_edition ? `
            <span style="display: inline-block; background: #dc2626; color: #ffffff; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase;">
              Limited Edition
            </span>
          ` : ''}
        </div>
        <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #1a1a1a; font-weight: bold;">
          ${release.title}
        </h2>
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #666666;">
          ${PARK_NAMES[release.park]} &bull; ${CATEGORY_NAMES[release.category]}
        </p>
        ${release.description ? `
          <p style="margin: 0 0 16px 0; font-size: 14px; color: #444444; line-height: 1.5;">
            ${release.description.slice(0, 200)}${release.description.length > 200 ? '...' : ''}
          </p>
        ` : ''}
        ${release.price_estimate ? `
          <p style="margin: 0 0 16px 0; font-size: 18px; color: #1a1a1a; font-weight: bold;">
            ~$${release.price_estimate.toFixed(2)}
          </p>
        ` : ''}
        <a href="https://enchantedparkpickups.com/new-releases/${release.id}" style="display: inline-block; background: linear-gradient(135deg, #FFD700, #FFA500); color: #1a1a1a; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 14px;">
          Request This Item
        </a>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Releases</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #1a1a1a, #2d2d2d); border-radius: 12px 12px 0 0;">
      <h1 style="margin: 0; font-size: 28px; background: linear-gradient(135deg, #FFD700, #FFA500); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: bold;">
        Enchanted Park Pickups
      </h1>
      <p style="margin: 8px 0 0 0; color: #999999; font-size: 14px;">
        Your personal shopper at the parks
      </p>
    </div>

    <!-- Content -->
    <div style="background: #fafafa; padding: 30px 20px; border-radius: 0 0 12px 12px;">
      <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">
        Hey ${customerName}!
      </p>
      <p style="margin: 0 0 24px 0; font-size: 16px; color: #333333; line-height: 1.5;">
        ${releases.length === 1
          ? releases[0].park_exclusive
            ? "I spotted something special at the park that you can only get in person!"
            : "I just found something you might love!"
          : `I found ${releases.length} new items that match your interests!`
        }
      </p>

      <!-- Release Cards -->
      ${releaseCards}

      <!-- CTA -->
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #ffffff; border-radius: 12px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666666;">
          Want me to pick this up for you on my next trip?
        </p>
        <a href="https://enchantedparkpickups.com/new-releases" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">
          View All New Releases
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 30px 20px; color: #999999; font-size: 12px;">
      <p style="margin: 0 0 8px 0;">
        Enchanted Park Pickups | Orlando, FL
      </p>
      <p style="margin: 0 0 16px 0;">
        Personal shopping from Walt Disney World, Universal Orlando & SeaWorld
      </p>
      <p style="margin: 0;">
        <a href="https://enchantedparkpickups.com/unsubscribe" style="color: #999999;">
          Unsubscribe
        </a>
        &nbsp;&bull;&nbsp;
        <a href="https://enchantedparkpickups.com/preferences" style="color: #999999;">
          Update Preferences
        </a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateEmailText({ customerName, releases }: TemplateData): string {
  const releaseText = releases.map(release => {
    const tags = [];
    if (release.park_exclusive) tags.push('PARK EXCLUSIVE');
    if (release.is_limited_edition) tags.push('LIMITED EDITION');

    return `
${tags.length > 0 ? `[${tags.join(' | ')}]\n` : ''}${release.title}
${PARK_NAMES[release.park]} - ${CATEGORY_NAMES[release.category]}
${release.price_estimate ? `~$${release.price_estimate.toFixed(2)}\n` : ''}${release.description ? `\n${release.description.slice(0, 200)}\n` : ''}
Request: https://enchantedparkpickups.com/new-releases/${release.id}
    `.trim();
  }).join('\n\n---\n\n');

  return `
Hey ${customerName}!

${releases.length === 1
  ? releases[0].park_exclusive
    ? "I spotted something special at the park that you can only get in person!"
    : "I just found something you might love!"
  : `I found ${releases.length} new items that match your interests!`
}

${releaseText}

---

View all new releases: https://enchantedparkpickups.com/new-releases

---
Enchanted Park Pickups
Orlando, FL

To unsubscribe, visit: https://enchantedparkpickups.com/unsubscribe
  `.trim();
}
