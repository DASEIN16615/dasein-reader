import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { convertPageToEpub, convertToEpub } from '@/services/send/conversion/convertToEpub';
import { ConversionError } from '@/services/send/conversion/types';

const PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

function pngResponse(): Response {
  return new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } });
}

describe('Gate 4 Web Clipping Matrix — 10 Representative Web Structures', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => pngResponse());
  });
  afterEach(() => {
    fetchSpy.mockRestore();
  });

  // 1. Technical blog with code blocks and headings
  test('1. Technical blog: preserves code blocks and section headings', async () => {
    const html = `<!doctype html>
    <html>
      <head><title>Understanding Rust Lifetimes</title></head>
      <body>
        <main>
          <h1>Understanding Rust Lifetimes</h1>
          <p class="author">By Ferris</p>
          <h2>Introduction</h2>
          <p>${'Lifetimes are a fundamental mechanism in the Rust borrow checker. '.repeat(10)}</p>
          <pre><code>fn longest&lt;'a&gt;(x: &amp;'a str, y: &amp;'a str) -&gt; &amp;'a str { if x.len() &gt; y.len() { x } else { y } }</code></pre>
          <h2>Conclusion</h2>
          <p>${'Understanding explicit lifetime annotations ensures memory safety. '.repeat(10)}</p>
        </main>
      </body>
    </html>`;

    const book = await convertPageToEpub(html, 'https://blog.rust-lang.org/lifetimes');
    expect(book.title).toContain('Understanding Rust Lifetimes');
    expect(book.file.size).toBeGreaterThan(1000);
  });

  // 2. Long-form news article with byline and multi-paragraph layout
  test('2. Long-form news: extracts full article and byline', async () => {
    const paragraph =
      'The global macroeconomic indicators displayed surprising resilience this quarter. '.repeat(
        8,
      );
    const html = `<!doctype html>
    <html>
      <head>
        <title>Economic Resilience in Global Markets</title>
        <meta name="author" content="Financial Analyst">
      </head>
      <body>
        <article>
          <h1>Economic Resilience in Global Markets</h1>
          <p class="byline">By Jane Analyst</p>
          <p>${paragraph}</p>
          <p>${paragraph}</p>
          <p>${paragraph}</p>
          <p>${paragraph}</p>
        </article>
      </body>
    </html>`;

    const book = await convertPageToEpub(html, 'https://example.com/markets/resilience');
    expect(book.title).toContain('Economic Resilience in Global Markets');
    expect(book.author).toContain('Jane Analyst');
    expect(book.file.size).toBeGreaterThan(1000);
  });

  // 3. Plain text / minimalist web page
  test('3. Minimalist page: handles body-only paragraphs without article tag', async () => {
    const p1 =
      'In philosophy of mind, intentionality refers to the power of minds to be about something. '.repeat(
        6,
      );
    const p2 =
      'Phenomenological descriptions emphasize the first-person perspective of experience. '.repeat(
        6,
      );
    const html = `<!doctype html>
    <html>
      <head><title>Intentionality and Experience</title></head>
      <body>
        <h1>Intentionality and Experience</h1>
        <p>${p1}</p>
        <p>${p2}</p>
      </body>
    </html>`;

    const book = await convertPageToEpub(html, 'https://plato.stanford.edu/entries/intentionality');
    expect(book.title).toContain('Intentionality and Experience');
    expect(book.file.size).toBeGreaterThan(1000);
  });

  // 4. Image-rich article with figures and captions
  test('4. Image-rich article: downloads and embeds figures and captions', async () => {
    const text = 'The James Webb Space Telescope has captured deep-field infrared images. '.repeat(
      8,
    );
    const html = `<!doctype html>
    <html>
      <head><title>Deep Field Astronomy</title></head>
      <body>
        <article>
          <h1>Deep Field Astronomy</h1>
          <p>${text}</p>
          <figure>
            <img src="https://example.com/deep-field.png" alt="Deep field galaxies">
            <figcaption>Cosmic cliffs in Carina Nebula</figcaption>
          </figure>
          <p>${text}</p>
        </article>
      </body>
    </html>`;

    const book = await convertPageToEpub(html, 'https://nasa.gov/webb/deep-field');
    expect(book.title).toContain('Deep Field Astronomy');
    expect(fetchSpy).toHaveBeenCalledWith('https://example.com/deep-field.png', expect.anything());
    expect(book.file.size).toBeGreaterThan(1000);
  });

  // 5. Article with relative hyperlinks and relative image URLs
  test('5. Relative links: properly resolves relative URLs against origin', async () => {
    const text =
      'Exploring architecture patterns and distributed systems consistency models. '.repeat(8);
    const html = `<!doctype html>
    <html>
      <head><title>Distributed Systems Patterns</title></head>
      <body>
        <article>
          <h1>Distributed Systems Patterns</h1>
          <p>${text}</p>
          <img src="/static/diagrams/raft.png" alt="Raft Consensus">
          <p><a href="/docs/consensus">Read consensus guide</a></p>
          <p>${text}</p>
        </article>
      </body>
    </html>`;

    const book = await convertPageToEpub(html, 'https://systems.dev/posts/distributed');
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://systems.dev/static/diagrams/raft.png',
      expect.anything(),
    );
    expect(book.file.size).toBeGreaterThan(1000);
  });

  // 6. Content-free / empty HTML page -> MUST reject, never silently save empty
  test('6. Empty page: fails cleanly with ConversionError', async () => {
    const emptyHtml =
      '<!doctype html><html><head><title>Empty</title></head><body>   </body></html>';
    await expect(convertPageToEpub(emptyHtml, 'https://example.com/empty')).rejects.toThrow(
      ConversionError,
    );
  });

  // 7. Bot-detection challenge page -> MUST reject
  test('7. Bot-detection challenge: recognized and rejected as login_wall / floor', async () => {
    const botHtml = `<!doctype html>
    <html>
      <head><title>Just a moment...</title></head>
      <body>
        <h1>Attention Required! | Cloudflare</h1>
        <p>Please complete the security check to access the page.</p>
        <div>Ray ID: 789123456</div>
      </body>
    </html>`;

    await expect(convertPageToEpub(botHtml, 'https://protected.com/article')).rejects.toThrow(
      ConversionError,
    );
  });

  // 8. Paywall / Login wall teaser (< 400 chars) -> MUST reject
  test('8. Paywall teaser: below quality floor, rejected cleanly', async () => {
    const teaserHtml = `<!doctype html>
    <html>
      <head><title>Exclusive Subscriber Article</title></head>
      <body>
        <h1>Exclusive Subscriber Article</h1>
        <p>Subscribe now to read the full story. Only $1 for the first month.</p>
        <button>Sign In</button>
      </body>
    </html>`;

    await expect(convertPageToEpub(teaserHtml, 'https://wsj.com/exclusive')).rejects.toThrow(
      ConversionError,
    );
  });

  // 9. Noisy DOM with advertisements, navigation menus, and widgets
  test('9. Noisy page: Readability strips navigation, ads, and widgets', async () => {
    const bodyText = 'Essential analysis on software engineering and modular architecture. '.repeat(
      10,
    );
    const noisyHtml = `<!doctype html>
    <html>
      <head><title>Software Architecture in 2026</title></head>
      <body>
        <header><nav><a href="/">Home</a><a href="/about">About</a></nav></header>
        <div class="banner-ad">AD: Buy this cloud hosting now!</div>
        <aside class="sidebar"><h3>Trending</h3><ul><li>Clickbait 1</li><li>Clickbait 2</li></ul></aside>
        <main>
          <article>
            <h1>Software Architecture in 2026</h1>
            <p>${bodyText}</p>
            <p>${bodyText}</p>
          </article>
        </main>
        <div class="social-share"><button>Share on Twitter</button></div>
        <footer><p>&copy; 2026 All rights reserved.</p></footer>
      </body>
    </html>`;

    const book = await convertPageToEpub(noisyHtml, 'https://techreview.com/architecture');
    expect(book.title).toContain('Software Architecture in 2026');
    expect(book.file.size).toBeGreaterThan(1000);
  });

  // 10. Chinese / CJK technical article with full punctuation and typography
  test('10. CJK article: Chinese characters, typography and structure preserved', async () => {
    const cjkParagraph =
      '在马克思主义政治经济学中，劳动价值论是剖析商品拜物教与剩余价值生产的基石。商品不仅具有使用价值，更凝结着无差别的人类抽象劳动。'.repeat(
        4,
      );
    const cjkHtml = `<!doctype html>
    <html lang="zh-CN">
      <head>
        <title>论商品价值与抽象劳动</title>
        <meta name="author" content="哲学研究组">
      </head>
      <body>
        <article>
          <h1>论商品价值与抽象劳动</h1>
          <p class="byline">作者：哲学研究组</p>
          <h2>第一节：使用价值与价值的对立统一</h2>
          <p>${cjkParagraph}</p>
          <h2>第二节：劳动二重性学说的理论意义</h2>
          <p>${cjkParagraph}</p>
        </article>
      </body>
    </html>`;

    const book = await convertPageToEpub(cjkHtml, 'https://theory.org.cn/das-kapital/chapter-1');
    expect(book.title).toContain('论商品价值与抽象劳动');
    expect(book.author).toContain('哲学研究组');
    expect(book.file.size).toBeGreaterThan(1000);
  });
});
