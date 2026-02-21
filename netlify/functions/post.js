const SITE_URL = process.env.SITE_URL || 'https://m2zreviews.netlify.app';
const FALLBACK_HERO = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80';

const DEFAULTS = {
  endpoint: 'https://sfo.cloud.appwrite.io/v1',
  projectId: 'm2z-reviews',
  databaseId: 'm2z-reviews',
  postsCollectionId: 'posts'
};

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m]));


function slugify(value = '') {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeEndpoint(endpoint = '') {
  const trimmed = String(endpoint || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/$/, '');
  return `https://${trimmed.replace(/\/$/, '')}`;
}

function htmlPage({ title, description = '', canonical = SITE_URL, robots = 'index,follow', body = '', bodyAttrs = '', image = FALLBACK_HERO, schema = null }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${robots}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="stylesheet" href="/css/style.css">
  ${schema ? `<script type="application/ld+json">${JSON.stringify(schema)}</script>` : ''}
</head>
<body${bodyAttrs ? ` ${bodyAttrs}` : ''}>
  ${body}
</body>
</html>`;
}

function renderNotFound(slug) {
  const canonical = `${SITE_URL}/post/${encodeURIComponent(slug || '')}`;
  return htmlPage({
    title: 'Post Not Found | M2Z Reviews',
    description: 'The requested post could not be found.',
    canonical,
    robots: 'noindex,follow',
    body: '<main class="layout"><article class="content article"><h1>Post not found</h1><p>The post you requested does not exist.</p><p><a href="/reviews.html">Browse reviews</a></p></article></main>'
  });
}

function renderServerError(slug) {
  const canonical = `${SITE_URL}/post/${encodeURIComponent(slug || '')}`;
  return htmlPage({
    title: 'Unable to load post | M2Z Reviews',
    description: 'The post is temporarily unavailable.',
    canonical,
    robots: 'noindex,follow',
    body: '<main class="layout"><article class="content article"><h1>Unable to load post</h1><p>Please try again shortly.</p><p><a href="/reviews.html">Browse reviews</a></p></article></main>'
  });
}

function renderPost(post, slug) {
  const title = post.title || 'Untitled Post';
  const description = post.description || `Read ${title} on M2Z Reviews.`;
  const heroImage = post.heroImage || post.ogImage || FALLBACK_HERO;
  const canonical = `${SITE_URL}/post/${encodeURIComponent(slug)}`;
  const stats = typeof post.stats === 'string' ? (() => { try { return JSON.parse(post.stats); } catch { return {}; } })() : (post.stats || {});
  const content = post.content || post.contentHtml || '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image: heroImage,
    datePublished: post.publishDate || '',
    author: { '@type': 'Person', name: post.author || 'M2Z Reviews' },
    publisher: { '@type': 'Organization', name: 'M2Z Reviews' },
    mainEntityOfPage: canonical
  };

  return htmlPage({
    title,
    description,
    canonical,
    image: heroImage,
    schema,
    bodyAttrs: `data-page="post" data-slug="${escapeHtml(slug)}"`,
    body: `<header class="site-header"><a class="logo" href="/">M2Z Reviews</a><nav class="nav"><a href="/reviews.html">Reviews</a><a href="/compare.html">Compare</a><a href="/about.html">About</a><button class="theme-toggle" data-theme-toggle>🌙</button></nav></header>
  <main class="layout">
    <article class="content article">
      <p class="meta">Published ${escapeHtml(post.publishDate || '')} • ${escapeHtml(post.readingTime || '')}</p>
      <h1>${escapeHtml(title)}</h1>
      <img class="hero-image" src="${escapeHtml(heroImage)}" alt="${escapeHtml(post.heroAlt || `${title} hero image`)}">
      ${content}
      <section class="post-actions"><button type="button" class="btn" data-like-btn>👍 Like <span>${Number(stats.likes || 0)}</span></button><button type="button" class="btn" data-share-btn>↗ Share <span>${Number(stats.shares || 0)}</span></button><button type="button" class="btn" data-save-btn>⭐ Save</button></section>
      <section class="related"><h2>Related posts</h2><div class="posts-grid" data-related-posts></div></section>
    </article>
    <aside class="sidebar"><section class="card"><h3>Latest posts</h3><ul class="list" data-sidebar-latest></ul></section><section class="card"><h3>Trending</h3><ul class="list" data-sidebar-trending></ul></section></aside>
  </main>
  <footer class="site-footer">© 2026 M2Z Reviews.</footer>
  <script src="/js/appwrite-config.js" defer></script>
  <script src="/js/global.js" defer></script>`
  });
}

function extractSlug(event) {
  const fromQuery = event?.queryStringParameters?.slug;
  if (fromQuery) return String(fromQuery).trim();
  const fromPath = event?.pathParameters?.slug;
  if (fromPath) return String(fromPath).trim();

  try {
    const path = event?.rawUrl ? new URL(event.rawUrl).pathname : (event?.path || '');
    const match = String(path).match(/^\/post\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]).trim() : '';
  } catch {
    return '';
  }
}

function getConfig() {
  return {
    endpoint: normalizeEndpoint(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || DEFAULTS.endpoint),
    projectId: process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || DEFAULTS.projectId,
    databaseId: process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || DEFAULTS.databaseId,
    postsCollectionId: process.env.APPWRITE_POSTS_COLLECTION_ID || process.env.VITE_APPWRITE_POSTS_COLLECTION_ID || DEFAULTS.postsCollectionId,
    apiKey: process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || ''
  };
}

async function queryPostBySlug(cfg, slug) {
  const normalizedTarget = slugify(slug);
  const headers = {
    'X-Appwrite-Project': cfg.projectId,
    ...(cfg.apiKey ? { 'X-Appwrite-Key': cfg.apiKey } : {})
  };

  const queryVariants = [
    [`equal("slug",["${slug}"])`, 'limit(1)'],
    [`equal("slug","${slug}")`, 'limit(1)']
  ];

  for (const queries of queryVariants) {
    const params = new URLSearchParams();
    queries.forEach((q) => params.append('queries[]', q));
    const url = `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.postsCollectionId}/documents?${params.toString()}`;

    const res = await fetch(url, { headers });

    if (!res.ok) {
      if (res.status === 400 && queries[0].includes('[')) continue;
      if (res.status === 404) continue;
      return { status: res.status, post: null };
    }

    const payload = await res.json();
    const post = payload.documents?.[0] || null;
    if (post) return { status: 200, post };
  }

  // Fallback scan: handles mismatched field naming, query parser differences, and legacy docs.
  let offset = 0;
  while (offset < 1000) {
    const params = new URLSearchParams();
    params.append('queries[]', 'limit(100)');
    params.append('queries[]', `offset(${offset})`);
    const url = `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.postsCollectionId}/documents?${params.toString()}`;
    const res = await fetch(url, { headers });
    if (!res.ok) return { status: res.status, post: null };

    const payload = await res.json();
    const docs = Array.isArray(payload.documents) ? payload.documents : [];
    const match = docs.find((d) => {
      const candidates = [d.slug, d.Slug, d.postSlug, d.title].filter(Boolean).map((v) => slugify(v));
      return candidates.includes(normalizedTarget);
    });
    if (match) return { status: 200, post: match };
    if (docs.length < 100) break;
    offset += 100;
  }

  return { status: 404, post: null };
}

async function tryStaticFallback(event, slug) {
  const host = event?.headers?.host;
  const proto = event?.headers?.['x-forwarded-proto'] || 'https';
  if (!host) return null;

  try {
    const res = await fetch(`${proto}://${host}/data/posts.json`);
    if (!res.ok) return null;
    const posts = await res.json();
    return Array.isArray(posts) ? posts.find((p) => p.slug === slug) || null : null;
  } catch {
    return null;
  }
}

export async function handler(event) {
  const rawSlug = extractSlug(event);
  const slug = rawSlug.replace(/["\\]/g, '').trim();
  if (!slug) {
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: renderNotFound('') };
  }

  const cfg = getConfig();
  if (!cfg.endpoint || !cfg.projectId || !cfg.databaseId || !cfg.postsCollectionId) {
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: renderServerError(slug) };
  }

  try {
    const { status, post } = await queryPostBySlug(cfg, slug);
    if (post) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
        body: renderPost(post, slug)
      };
    }

    const fallback = await tryStaticFallback(event, slug);
    if (fallback) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
        body: renderPost(fallback, slug)
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: status === 401 || status === 403 ? renderServerError(slug) : renderNotFound(slug)
    };
  } catch {
    const fallback = await tryStaticFallback(event, slug);
    if (fallback) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
        body: renderPost(fallback, slug)
      };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: renderServerError(slug) };
  }
}
