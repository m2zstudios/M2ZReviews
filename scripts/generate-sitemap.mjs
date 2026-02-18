import { readFile, writeFile } from 'node:fs/promises';

const site = 'https://example.com';
const posts = JSON.parse(await readFile(new URL('../data/posts.json', import.meta.url), 'utf8'));
const staticPages = ['/', '/reviews.html', '/compare.html', '/about.html'];

const urls = [
  ...staticPages.map((path) => ({ loc: `${site}${path}`, lastmod: new Date().toISOString().slice(0, 10) })),
  ...posts.map((p) => ({ loc: `${site}/posts/${p.slug}.html`, lastmod: p.publishDate }))
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await writeFile(new URL('../sitemap.xml', import.meta.url), xml);
console.log(`Generated sitemap.xml with ${urls.length} URLs.`);
