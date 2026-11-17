import { describe, expect, it } from 'vitest';
import { extractFromHtml } from '../src/services/extractText';

const HTML = `<!doctype html><html><head><title>Fallback Title</title>
<meta property="og:title" content="Great Article"></head><body>
<nav><a href="/">Home</a><a href="/about">About</a></nav>
<script>window.track = "ignore me";</script>
<article><h1>Great Article</h1>
<p>The first   paragraph has <b>bold</b> text.</p>
<ul><li>First point</li><li>Second point</li></ul></article>
<footer>Copyright junk</footer></body></html>`;

describe('extractFromHtml', () => {
  const page = extractFromHtml(HTML);

  it('prefers the og:title', () => expect(page.title).toBe('Great Article'));
  it('keeps article text with normalized whitespace', () => {
    expect(page.text).toContain('The first paragraph has bold text.');
    expect(page.text).toContain('First point');
  });
  it('drops scripts, navigation and footer', () => {
    expect(page.text).not.toContain('ignore me');
    expect(page.text).not.toContain('Home');
    expect(page.text).not.toContain('Copyright');
  });
  it('does not duplicate nested block text', () => {
    expect(page.text.match(/First point/g)).toHaveLength(1);
  });
});
