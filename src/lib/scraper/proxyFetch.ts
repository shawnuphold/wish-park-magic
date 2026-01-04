const BLOCKED_DOMAINS = [
  'wdwnt.com',
  'blogmickey.com',
  'chipandco.com',
  'attractionsmagazine.com',
  'disneyfoodblog.com',
  'allears.net'
];

export async function smartFetch(url: string): Promise<Response> {
  const domain = new URL(url).hostname.replace('www.', '');
  const needsProxy = BLOCKED_DOMAINS.some(d => domain.includes(d));

  if (needsProxy && process.env.SCRAPER_API_KEY) {
    console.log(`[Proxy] Fetching via ScraperAPI: ${url}`);
    const proxyUrl = `http://api.scraperapi.com?api_key=${process.env.SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
    return fetch(proxyUrl);
  }

  console.log(`[Direct] Fetching: ${url}`);
  return fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
}

export async function smartFetchText(url: string): Promise<string> {
  const response = await smartFetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}
