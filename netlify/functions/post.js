const SITE_URL = process.env.SITE_URL || 'https://m2zreviews.netlify.app';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m]));

function renderNotFound(slug) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Post Not Found | M2Z Reviews</title>
  <meta name="robots" content="noindex,follow">
  <link rel="canonical" href="${SITE_URL}/post/${encodeURIComponent(slug || '')}">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <main class="layout"><article class="content article"><h1>Post not found</h1><p>The post you requested does not exist.</p><p><a href="/reviews.html">Browse reviews</a></p></article></main>
</body>
</html>`;
}

function renderPost(post, slug) {
  const title = post.title || 'Untitled Post';
  const description = post.description || `Read ${title} on M2Z Reviews.`;
  const heroImage = post.heroImage || post.ogImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80';
  const canonical = `${SITE_URL}/post/${slug}`;
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

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${escapeHtml(heroImage)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="${escapeHtml(heroImage)}">
  <link rel="stylesheet" href="/css/style.css">
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body data-page="post" data-slug="${escapeHtml(slug)}">
  <header class="site-header"><a class="logo" href="/">M2Z Reviews</a><nav class="nav"><a href="/reviews.html">Reviews</a><a href="/compare.html">Compare</a><a href="/about.html">About</a><button class="theme-toggle" data-theme-toggle>🌙</button></nav></header>
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
  <script src="/js/global.js" defer></script>
</body>
</html>`;
}

export async function handler(event) {
  const slug = (event.queryStringParameters?.slug || '').trim();
  const safeSlug = slug.replace(/["\\]/g, '');
  if (!slug) {
    return { statusCode: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: renderNotFound(slug) };
  }

  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT;
  const projectId = process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID;
  const databaseId = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;
  const postsCollectionId = process.env.APPWRITE_POSTS_COLLECTION_ID || process.env.VITE_APPWRITE_POSTS_COLLECTION_ID;
  const apiKey = process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY;

  if (!endpoint || !projectId || !databaseId || !postsCollectionId) {
    return { statusCode: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<h1>Server configuration error</h1>' };
  }

  const params = new URLSearchParams();
  params.append('queries[]', `equal("slug","${safeSlug}")`);
  params.append('queries[]', 'limit(1)');
  const url = `${endpoint}/databases/${databaseId}/collections/${postsCollectionId}/documents?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: {
        'X-Appwrite-Project': projectId,
        ...(apiKey ? { 'X-Appwrite-Key': apiKey } : {})
      }
    });

    if (!res.ok) {
      return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: renderNotFound(slug) };
    }

    const payload = await res.json();
    const post = payload.documents?.[0];
    if (!post) {
      return { statusCode: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: renderNotFound(slug) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
      body: renderPost(post, slug)
    };
  } catch {
    return { statusCode: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' }, body: '<h1>Unable to load post</h1>' };
  }
}
