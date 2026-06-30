import { load } from 'cheerio';

// Whitelist of allowed camphub category slugs. The client only ever sends a
// slug from this list; the server builds the URL. This keeps the proxy closed
// (no SSRF — the client cannot point us at an arbitrary host).
const ALLOWED_CATEGORIES = new Set([
  // หมอ/ทันตะ/วิทย์สุขภาพ
  'medical-health/doctor', 'medical-health/dentist', 'medical-health/nurse',
  'medical-health/pharma', 'medical-health/psychology', 'medical-health/vet',
  'medical-health/allied-health-sciences', 'medical-health/health-other',
  // สายวิทย์/วิศวะ
  'engineer', 'science', 'computer', 'aviation', 'architect-design', 'agri-fishery',
  // สายศิลป์
  'law', 'political', 'account-commerce', 'commarts', 'teacher', 'lang-human',
  'social', 'economic', 'logistics', 'hospitality', 'music',
  // ตามมหาลัย
  'tag/chulalongkorn-university', 'tag/thammasat-university', 'tag/mahidol-university',
  'tag/kasetsart-university', 'tag/kmitl-king-mongkuts-institute-of-technology-ladkrabang',
  'tag/kmutt-king-mongkuts-university-of-technology-thonburi', 'tag/silpakorn-university',
  'tag/chiang-mai-university', 'tag/srinakharinwirot-university',
  'tag/kmutnb-king-mongkuts-university-of-technology-north-bangkok',
  'tag/khon-kaen-university', 'tag/naresuan-university', 'tag/burapha-university',
  'tag/prince-of-songkla-university', 'tag/suranaree-university-of-technology',
  'tag/rajamangala-university-of-technology', 'tag/rajabhat-university',
  // เอกชน + การแข่งขัน
  'private-university', 'contest',
]);

const DEFAULT_CATEGORY = 'computer';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const category = req.query.category || DEFAULT_CATEGORY;
  if (!ALLOWED_CATEGORIES.has(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const response = await fetch(`https://www.camphub.in.th/${category}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch camphub: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);

    const camps = [];
    $('article').each((_, article) => {
      const $article = $(article);
      const $link = $article.find('a').first();
      const $desc = $article.find('p').first();
      const $img = $article.find('img').first();

      const title = $link.attr('title');
      const link = $link.attr('href');
      const smallDescription = $desc.text().trim();
      const posterImage = $img.attr('data-src') || $img.attr('src');

      if (title && link) {
        camps.push({
          title,
          link,
          small_description: smallDescription,
          poster_image: posterImage
        });
      }
    });

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json(camps);
  } catch (error) {
    console.error('Error scraping camphub:', error);
    res.status(500).json({ error: 'Failed to fetch camp data' });
  }
}
