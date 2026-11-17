import * as cheerio from 'cheerio';

export interface ExtractedPage {
  title: string | null;
  text: string;
}

const NOISE = 'script, style, noscript, svg, nav, footer, header, aside, form, iframe';
const BLOCKS = 'h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, td';

const clean = (s: string): string => s.replace(/\s+/g, ' ').trim();

/** Pulls readable text out of an HTML page: removes boilerplate, keeps one paragraph per block element. */
export function extractFromHtml(html: string): ExtractedPage {
  const $ = cheerio.load(html);
  const title = clean($('meta[property="og:title"]').attr('content') ?? $('title').first().text()) || null;
  $(NOISE).remove();

  let root = $('article').first();
  if (root.length === 0) root = $('main').first();
  if (root.length === 0) root = $('body').first();

  const blocks = root
    .find(BLOCKS)
    .filter((_, el) => $(el).find(BLOCKS).length === 0) // innermost blocks only: avoids duplicated text
    .map((_, el) => clean($(el).text()))
    .get()
    .filter((t) => t.length > 0);

  const text = blocks.length > 0 ? blocks.join('\n\n') : clean(root.text());
  return { title, text };
}

export function extractFromPlainText(body: string): ExtractedPage {
  return { title: null, text: body.replace(/\r\n/g, '\n').trim() };
}
