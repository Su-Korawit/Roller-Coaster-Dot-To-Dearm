import { load } from 'cheerio';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch('https://www.camphub.in.th/computer/', {
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
