import Parser from 'rss-parser';

async function findImages() {
  const parser = new Parser({
    customFields: {
      item: [['content:encoded', 'contentEncoded']],
    },
  });

  const feed = await parser.parseURL('https://wdwnt.com/feed/');

  // Look for items matching our problematic ones
  const targets = [
    'gabby',
    'sorcerer mickey',
    'sorcery',
    'shopping bag',
    'universal',
    'reusable',
    'coffee mug'
  ];

  for (const item of feed.items) {
    const title = (item.title || '').toLowerCase();
    const content = (item as any).contentEncoded || '';

    // Check if title matches any target
    const matches = targets.some(t => title.includes(t));
    if (matches) {
      console.log('='.repeat(60));
      console.log('Title:', item.title);
      console.log('Link:', item.link);

      // Extract images from content
      const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
      let match;
      const images: string[] = [];
      while ((match = imgRegex.exec(content)) !== null) {
        if (match[1].includes('media.wdwnt.com')) {
          images.push(match[1]);
        }
      }
      console.log('Images found:', images.length);
      images.forEach((img, i) => console.log('  ' + (i+1) + ':', img));
    }
  }
}
findImages();
