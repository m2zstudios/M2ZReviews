const SITE_URL = 'https://example.com';

const state = { posts: [], settings: null };

async function loadPosts() {
  if (state.posts.length) return state.posts;

  try {
    const cfg = window.APPWRITE_CONFIG || {};
    if (cfg.endpoint && cfg.projectId && cfg.databaseId && cfg.postsCollectionId) {
      const url = `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.postsCollectionId}/documents?limit=100`;
      const res = await fetch(url, { headers: { 'X-Appwrite-Project': cfg.projectId } });
      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload.documents) && payload.documents.length) {
          state.posts = payload.documents.map((d) => {
            let stats = { likes: 0, shares: 0 };
            if (typeof d.stats === 'string') {
              try { stats = { ...stats, ...JSON.parse(d.stats) }; } catch {}
            } else if (d.stats && typeof d.stats === 'object') {
              stats = { ...stats, ...d.stats };
            }
            return {
              title: d.title,
              slug: d.slug,
              description: d.description,
              ogImage: d.ogImage,
              heroImage: d.heroImage,
              heroAlt: d.heroAlt,
              publishDate: d.publishDate,
              readingTime: d.readingTime,
              category: d.category,
              author: d.author,
              trending: !!d.trending,
              stats
            };
          });
        }
      }
    }
  } catch {}

  if (!state.posts.length) {
    const res = await fetch('/data/posts.json');
    state.posts = await res.json();
    state.posts = state.posts.map((p) => ({ ...p, stats: p.stats || { likes: 0, shares: 0 } }));
  }

  state.posts.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  return state.posts;
}


async function loadSettings() {
  if (state.settings) return state.settings;
  const cfg = window.APPWRITE_CONFIG || {};
  try {
    if (cfg.endpoint && cfg.projectId && cfg.databaseId && cfg.settingsCollectionId) {
      const res = await fetch(`${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.settingsCollectionId}/documents?limit=1`, {
        headers: { 'X-Appwrite-Project': cfg.projectId }
      });
      if (res.ok) {
        const payload = await res.json();
        state.settings = payload.documents?.[0] || {};
        return state.settings;
      }
    }
  } catch {}
  state.settings = {};
  return state.settings;
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.querySelector('[data-theme-toggle]');
  if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

function initThemeToggle() {
  applyTheme(localStorage.getItem('theme') || 'light');
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });
}

function renderList(el, posts, opts = {}) {
  if (!el) return;
  el.innerHTML = posts.map((p) => `<li><a href="/posts/${p.slug}.html">${p.title}</a>${opts.meta ? `<div class="meta">${p.publishDate} • ${p.readingTime}</div>` : ''}</li>`).join('');
}

function truncate(text = '', max = 200) {
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function postCard(post) {
  return `<article class="post-card">
    <a href="/posts/${post.slug}.html"><img loading="lazy" src="${post.heroImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80'}" alt="${post.heroAlt || post.title}"></a>
    <div class="copy">
      <span class="badge">${post.category}</span>
      <h3><a href="/posts/${post.slug}.html">${post.title}</a></h3>
      <p>${truncate(post.description || '', 200)}</p>
      <div class="meta">${post.publishDate} • ${post.readingTime}</div>
    </div>
  </article>`;
}

function initHeaderEnhancements() {
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.nav');
  if (!header || !nav) return;
  header.classList.add('header-enhanced');

  const path = location.pathname === '/' ? '/' : location.pathname.replace(/\/$/, '');
  nav.querySelectorAll('a').forEach((a) => {
    const href = (a.getAttribute('href') || '').replace(/\/$/, '');
    if (href && href === path) a.classList.add('active');
  });

  if (!header.querySelector('.nav-toggle')) {
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'nav-toggle';
    toggle.setAttribute('aria-label', 'Toggle navigation');
    toggle.textContent = 'Menu';
    header.insertBefore(toggle, nav);
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
}

function injectBreadcrumb() {
  const page = document.body.dataset.page;
  if (page === 'home' || page === 'admin' || document.querySelector('.breadcrumb')) return;

  const map = {
    listing: [{ name: 'Home', href: '/' }, { name: 'Reviews', href: '/reviews.html' }],
    compare: [{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare.html' }],
    about: [{ name: 'Home', href: '/' }, { name: 'About', href: '/about.html' }],
    post: [{ name: 'Home', href: '/' }, { name: 'Reviews', href: '/reviews.html' }, { name: 'Article', href: location.pathname }]
  };

  const items = map[page];
  if (!items) return;
  const nav = document.createElement('nav');
  nav.className = 'breadcrumb';
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.innerHTML = items.map((item, idx) => idx === items.length - 1 ? `<span>${item.name}</span>` : `<a href="${item.href}">${item.name}</a>`).join('<i>/</i>');
  document.querySelector('.site-header')?.insertAdjacentElement('afterend', nav);
}


function applyGlobalMetaSettings(settings) {
  if (!settings) return;
  const page = document.body.dataset.page;
  if (['post', 'about', 'compare', 'admin'].includes(page)) return;
  if (settings.SiteTitle) document.title = settings.SiteTitle;
  if (settings.MetaDesc) {
    const m = document.querySelector('meta[name="description"]');
    const ogd = document.querySelector('meta[property="og:description"]');
    if (m) m.setAttribute('content', settings.MetaDesc);
    if (ogd) ogd.setAttribute('content', settings.MetaDesc);
  }
  if (settings.OGImage) {
    const ogi = document.querySelector('meta[property="og:image"]');
    const tw = document.querySelector('meta[name="twitter:image"]');
    if (ogi) ogi.setAttribute('content', settings.OGImage);
    if (tw) tw.setAttribute('content', settings.OGImage);
  }
}

function injectSearch(posts) {
  const nav = document.querySelector('.nav');
  if (!nav || nav.querySelector('[data-site-search]')) return;

  const wrap = document.createElement('form');
  wrap.className = 'search-wrap';
  wrap.setAttribute('data-site-search', '');
  wrap.innerHTML = `
    <input type="search" class="search-input" placeholder="Search posts..." aria-label="Search posts" />
    <button type="button" class="search-clear" aria-label="Clear search">×</button>
    <div class="search-results" hidden></div>
  `;

  const input = wrap.querySelector('.search-input');
  const clear = wrap.querySelector('.search-clear');
  const results = wrap.querySelector('.search-results');
  input.value = new URLSearchParams(location.search).get('q') || '';

  const renderResults = (q) => {
    const v = q.trim().toLowerCase();
    if (!v) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }
    const matches = posts.filter((p) => `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(v)).slice(0, 6);
    results.hidden = false;
    results.innerHTML = matches.length ? matches.map((p) => `<a href="/posts/${p.slug}.html">${p.title}<span>${p.category}</span></a>`).join('') : '<div class="search-empty">No matching posts</div>';
  };

  input.addEventListener('input', (e) => renderResults(e.target.value));
  clear.addEventListener('click', () => { input.value = ''; renderResults(''); input.focus(); });
  wrap.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    location.href = q ? `/reviews.html?q=${encodeURIComponent(q)}` : '/reviews.html';
  });

  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) results.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === '/' && document.activeElement !== input) { e.preventDefault(); input.focus(); } });

  nav.prepend(wrap);
}

async function saveNewsletterEmail(email) {
  const cfg = window.APPWRITE_CONFIG || {};
  if (!cfg.endpoint || !cfg.projectId || !cfg.databaseId || !cfg.newsletterSubscribersCollectionId) return false;
  const body = { documentId: 'unique()', data: { email } };
  const res = await fetch(`${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.newsletterSubscribersCollectionId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': cfg.projectId },
    body: JSON.stringify(body)
  });
  return res.ok;
}

function enhanceFooter(posts) {
  if (document.body.dataset.page === 'admin') return;
  const footer = document.querySelector('.site-footer');
  if (!footer || footer.dataset.enhanced === '1') return;
  const lastUpdated = posts[0]?.publishDate || new Date().toISOString().slice(0, 10);
  const year = new Date().getFullYear();

  footer.dataset.enhanced = '1';
  footer.innerHTML = `
    <section class="footer-grid">
      <div><h3>M2Z Reviews</h3><p>Trusted product reviews and buying insights.</p><p class="meta">Last update: ${lastUpdated}</p></div>
      <div><h4>Navigate</h4><ul><li><a href="/reviews.html">Reviews</a></li><li><a href="/compare.html">Compare</a></li><li><a href="/about.html">About</a></li></ul></div>
      <div><h4>Support</h4><ul><li><a href="/about.html">Disclaimer</a></li><li><a href="/about.html">Affiliate Info</a></li></ul></div>
      <div><h4>Newsletter</h4><form class="footer-news" data-footer-news><input type="email" required placeholder="Email address" aria-label="Email address" /><button class="btn" type="submit">Subscribe</button></form><p class="meta" data-news-status></p></div>
    </section>
    <p class="footer-bottom">© ${year} M2Z Reviews. All rights reserved.</p>
  `;

  footer.querySelector('[data-footer-news]')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = footer.querySelector('.footer-news input');
    const status = footer.querySelector('[data-news-status]');
    const email = input.value.trim().toLowerCase();
    if (!email) return;
    try {
      const ok = await saveNewsletterEmail(email);
      status.textContent = ok ? 'Subscribed successfully.' : 'Could not subscribe now.';
    } catch {
      status.textContent = 'Could not subscribe now.';
    }
  });
}

function injectAdAreas(page) {
  if (page === 'home' && !document.querySelector('.ad-area')) {
    const target = document.querySelector('.blocks');
    if (target) {
      const ad = document.createElement('section');
      ad.className = 'ad-area';
      const homeAd = localStorage.getItem('m2z-home-ad-url') || state.settings?.HPAdURL || 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1600&q=80';
      const homeAdRed = localStorage.getItem('m2z-home-ad-red-url') || state.settings?.HPAdRedURL || "#";
      ad.innerHTML = `<span class="ad-badge">Advertisement</span><a href="${homeAdRed}" target="_blank" rel="nofollow noopener"><img loading="lazy" src="${homeAd}" alt="Sponsored banner advertisement"></a>`;
      target.parentElement.insertBefore(ad, target);
    }
  }

  if (page === 'post') {
    const article = document.querySelector('.article');
    if (article && !article.querySelector('.ad-inline')) {
      const ad = document.createElement('section');
      ad.className = 'ad-area ad-inline';
      const postAd = localStorage.getItem('m2z-post-ad-url') || state.settings?.PPAdURL || 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1400&q=80';
      const postAdRed = localStorage.getItem('m2z-post-ad-red-url') || state.settings?.PPAdRedURL || "#";
      ad.innerHTML = `<span class="ad-badge">Advertisement</span><a href="${postAdRed}" target="_blank" rel="nofollow noopener"><img loading="lazy" src="${postAd}" alt="Sponsored product ad"></a>`;
      const related = article.querySelector('.related');
      article.insertBefore(ad, related || null);
    }
  }
}

function ensureLightbox() {
  if (document.getElementById('imgLightbox')) return;
  const wrap = document.createElement('div');
  wrap.id = 'imgLightbox';
  wrap.className = 'img-lightbox';
  wrap.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">×</button><img alt="Expanded image">';
  document.body.appendChild(wrap);
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap || e.target.classList.contains('lightbox-close')) wrap.classList.remove('open');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') wrap.classList.remove('open'); });
}

function bindLightboxOnArticle() {
  if (document.body.dataset.page !== 'post') return;
  ensureLightbox();
  const lightbox = document.getElementById('imgLightbox');
  const lbImg = lightbox.querySelector('img');
  document.querySelectorAll('.article .hero-image, .article .article-grid img, .article .image-grid img').forEach((img) => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      lbImg.src = img.src;
      lbImg.alt = img.alt || 'Expanded image';
      lightbox.classList.add('open');
    });
  });
}


async function incrementPostView(slug) {
  const cfg = window.APPWRITE_CONFIG || {};
  if (!cfg.endpoint || !cfg.projectId || !cfg.databaseId || !cfg.postsCollectionId || !slug) return;
  try {
    const listRes = await fetch(`${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.postsCollectionId}/documents?limit=100`, {
      headers: { 'X-Appwrite-Project': cfg.projectId }
    });
    if (!listRes.ok) return;
    const payload = await listRes.json();
    const doc = (payload.documents || []).find((d) => d.slug === slug);
    if (!doc?.$id) return;
    let st = { likes: 0, shares: 0, views: 0 };
    if (typeof doc.stats === 'string') {
      try { st = { ...st, ...JSON.parse(doc.stats) }; } catch {}
    } else if (doc.stats && typeof doc.stats === 'object') st = { ...st, ...doc.stats };
    st.views = Number(st.views || 0) + 1;
    await fetch(`${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.postsCollectionId}/documents/${doc.$id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': cfg.projectId },
      body: JSON.stringify({ data: { stats: JSON.stringify(st) } })
    });
  } catch {}
}

async function updatePostStats(slug, stats) {
  const cfg = window.APPWRITE_CONFIG || {};
  if (!cfg.endpoint || !cfg.projectId || !cfg.databaseId || !cfg.postsCollectionId || !slug) return;
  try {
    const listRes = await fetch(`${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.postsCollectionId}/documents?limit=100`, {
      headers: { 'X-Appwrite-Project': cfg.projectId }
    });
    if (!listRes.ok) return;
    const payload = await listRes.json();
    const doc = (payload.documents || []).find((d) => d.slug === slug);
    if (!doc?.$id) return;
    await fetch(`${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.postsCollectionId}/documents/${doc.$id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': cfg.projectId },
      body: JSON.stringify({ data: { stats: JSON.stringify(stats) } })
    });
  } catch {}
}

function setupPostEnhancements() {
  if (document.body.dataset.page !== 'post') return;

  const meta = document.querySelector('.article .meta');
  if (meta) meta.textContent = meta.textContent.replace(/\s*•\s*by\s+.*$/i, '');

  if (!document.querySelector('.reading-progress')) {
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const ratio = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    });
  }

  const slug = document.body.dataset.slug;
  const post = state.posts.find((p) => p.slug === slug) || { stats: { likes: 0, shares: 0, views: 0 } };
  incrementPostView(slug);
  const stats = { likes: Number(post.stats?.likes || 0), shares: Number(post.stats?.shares || 0) };

  if (meta && !document.querySelector('.author-core')) {
    const authorBlock = document.createElement('section');
    authorBlock.className = 'author-core';
    authorBlock.innerHTML = `
      <p><strong>Author : Meraz Ahmed</strong> <img src="https://cdn-icons-png.flaticon.com/512/1828/1828640.png" alt="Verified badge" width="18" height="18" loading="lazy"></p>
      <div class="post-actions">
        <button type="button" data-like-btn>👍 Like <span>${stats.likes}</span></button>
        <button type="button" data-share-btn>🔗 Share <span>${stats.shares}</span></button>
        <button type="button" data-save-btn>⭐ Save</button>
      </div>
    `;
    meta.insertAdjacentElement('afterend', authorBlock);

    const likeBtn = authorBlock.querySelector('[data-like-btn]');
    const shareBtn = authorBlock.querySelector('[data-share-btn]');
    const saveBtn = authorBlock.querySelector('[data-save-btn]');

    likeBtn.addEventListener('click', async () => {
      stats.likes += 1;
      likeBtn.querySelector('span').textContent = String(stats.likes);
      await updatePostStats(slug, stats);
    });

    shareBtn.addEventListener('click', async () => {
      if (navigator.share) {
        try { await navigator.share({ title: document.title, url: location.href }); } catch {}
      } else {
        await navigator.clipboard.writeText(location.href);
      }
      stats.shares += 1;
      shareBtn.querySelector('span').textContent = String(stats.shares);
      await updatePostStats(slug, stats);
    });

    saveBtn.addEventListener('click', () => {
      const saveKey = `saved:${location.pathname}`;
      const next = localStorage.getItem(saveKey) === '1' ? '0' : '1';
      localStorage.setItem(saveKey, next);
      saveBtn.textContent = next === '1' ? '⭐ Saved' : '⭐ Save';
    });
  }

  bindLightboxOnArticle();
}

function setupUtilityUi() {
  if (!document.querySelector('.back-top')) {
    const btn = document.createElement('button');
    btn.className = 'back-top';
    btn.textContent = '↑ Top';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => btn.classList.toggle('show', window.scrollY > 500));
  }
}

function renderReviewsControls(posts) {
  const host = document.querySelector('[data-review-controls]');
  if (!host) return;

  const categories = ['All', ...new Set(posts.map((p) => p.category))];
  host.innerHTML = `
    <div class="review-controls">
      <div class="category-pills" data-category-pills>${categories.map((c) => `<button type="button" data-cat="${c}">${c}</button>`).join('')}</div>
      <label class="sort-wrap">Sort<select data-sort><option value="new">Latest first</option><option value="old">Oldest first</option></select></label>
    </div>
    <p class="meta" data-review-stats></p>
  `;

  const params = new URLSearchParams(location.search);
  const q = (params.get('q') || '').trim().toLowerCase();
  let category = 'All';
  let sort = 'new';
  const grid = document.querySelector('[data-latest-grid]');
  const statsEl = host.querySelector('[data-review-stats]');

  const render = () => {
    let filtered = posts.filter((p) => category === 'All' || p.category === category);
    if (q) filtered = filtered.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(q));
    filtered = filtered.sort((a, b) => (sort === 'new' ? new Date(b.publishDate) - new Date(a.publishDate) : new Date(a.publishDate) - new Date(b.publishDate)));
    if (grid) grid.innerHTML = filtered.length ? filtered.map(postCard).join('') : '<div class="empty-state">No posts match your filters yet.</div>';
    if (statsEl) statsEl.textContent = `Showing ${filtered.length} post${filtered.length === 1 ? '' : 's'}${q ? ` for “${q}”` : ''}.`;
    host.querySelectorAll('[data-cat]').forEach((btn) => btn.classList.toggle('active', btn.dataset.cat === category));
  };

  host.querySelectorAll('[data-cat]').forEach((btn) => btn.addEventListener('click', () => { category = btn.dataset.cat; render(); }));
  host.querySelector('[data-sort]').addEventListener('change', (e) => { sort = e.target.value; render(); });
  render();
}

async function initHomepage() {
  const settings = await loadSettings();
  applyGlobalMetaSettings(settings);
  const posts = await loadPosts();
  const latestGrid = document.querySelector('[data-latest-grid]');
  if (latestGrid) latestGrid.innerHTML = posts.slice(0, 6).map(postCard).join('');
  renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
  renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));
  const categoriesEl = document.querySelector('[data-categories]');
  if (categoriesEl) categoriesEl.innerHTML = [...new Set(posts.map((p) => p.category))].map((c) => `<span class="badge">${c}</span>`).join(' ');
  const trendingEl = document.querySelector('[data-trending-block]');
  if (trendingEl) trendingEl.innerHTML = posts.filter((p) => p.trending).slice(0, 3).map((p) => `<li><a href="/posts/${p.slug}.html">${p.title}</a></li>`).join('');
  injectSearch(posts);
}

async function initPostPage() {
  const slug = document.body.dataset.slug;
  if (!slug) return;
  const settings = await loadSettings();
  applyGlobalMetaSettings(settings);
  const posts = await loadPosts();
  const current = posts.find((p) => p.slug === slug);
  if (!current) return;
  renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
  renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));
  const relatedEl = document.querySelector('[data-related-posts]');
  if (relatedEl) relatedEl.innerHTML = posts.filter((p) => p.slug !== slug && p.category === current.category).slice(0, 3).map(postCard).join('');
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `${SITE_URL}/posts/${slug}.html`;
  injectSearch(posts);
}

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  initHeaderEnhancements();
  injectBreadcrumb();
  setupUtilityUi();

  const settings = await loadSettings();
  applyGlobalMetaSettings(settings);
  const posts = await loadPosts();
  const page = document.body.dataset.page;

  if (page === 'home') await initHomepage();
  if (page === 'listing') {
    renderReviewsControls(posts);
    renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
    renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));
    injectSearch(posts);
  }
  if (page === 'post') await initPostPage();
  if (!['home', 'listing', 'post'].includes(page)) {
    renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
    renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));
    injectSearch(posts);
  }

  setupPostEnhancements();
  injectAdAreas(page);
  enhanceFooter(posts);
});
