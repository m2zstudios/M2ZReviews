const SITE_URL = 'https://example.com';

const state = { posts: [] };

async function loadPosts() {
  if (state.posts.length) return state.posts;
  const res = await fetch('/data/posts.json');
  state.posts = await res.json();
  state.posts.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
  return state.posts;
}

function applyTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const badge = document.querySelector('[data-theme-badge]');
  if (badge) badge.textContent = next === 'dark' ? 'Dark' : 'Light';
}

function initThemeToggle() {
  applyTheme(localStorage.getItem('theme') || 'light');
  const btn = document.querySelector('[data-theme-toggle]');
  if (!btn) return;
  if (!btn.querySelector('[data-theme-badge]')) {
    btn.innerHTML = `Theme <span class="theme-badge" data-theme-badge></span>`;
  }
  applyTheme(localStorage.getItem('theme') || 'light');

  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.key.toLowerCase() === 't') {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next);
    }
  });
}

function renderList(el, posts, opts = {}) {
  if (!el) return;
  el.innerHTML = posts.map((p) => `<li><a href="/posts/${p.slug}.html">${p.title}</a>${opts.meta ? `<div class="meta">${p.publishDate} • ${p.readingTime}</div>` : ''}</li>`).join('');
}

function postCard(post) {
  return `<article class="post-card">
    <a href="/posts/${post.slug}.html"><img loading="lazy" src="${post.heroImage || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1400&q=80'}" alt="${post.heroAlt || post.title}"></a>
    <div class="copy">
      <span class="badge">${post.category}</span>
      <h3><a href="/posts/${post.slug}.html">${post.title}</a></h3>
      <p>${post.description}</p>
      <div class="meta">${post.publishDate} • ${post.readingTime}</div>
    </div>
  </article>`;
}

function injectNoticeBar() {
  if (localStorage.getItem('m2z-hide-notice') === '1') return;
  if (document.querySelector('.site-notice') || document.body.dataset.page === 'admin') return;
  const bar = document.createElement('div');
  bar.className = 'site-notice';
  bar.innerHTML = `<p>🚀 New: Smarter search, review filters, and richer article tools are live.</p><button type="button" aria-label="Dismiss">×</button>`;
  document.body.prepend(bar);
  bar.querySelector('button').addEventListener('click', () => {
    localStorage.setItem('m2z-hide-notice', '1');
    bar.remove();
  });
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

  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('compact', y > 8);
    header.classList.toggle('down', y > lastY && y > 120);
    lastY = y;
  });
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

  const header = document.querySelector('.site-header');
  header?.insertAdjacentElement('afterend', nav);
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
  const currentQ = new URLSearchParams(location.search).get('q') || '';
  input.value = currentQ;

  const renderResults = (q) => {
    const v = q.trim().toLowerCase();
    if (!v) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }
    const matches = posts.filter((p) => `${p.title} ${p.description} ${p.category}`.toLowerCase().includes(v)).slice(0, 6);
    results.hidden = false;
    if (!matches.length) {
      results.innerHTML = '<div class="search-empty">No matching posts</div>';
      return;
    }
    results.innerHTML = matches.map((p) => `<a href="/posts/${p.slug}.html">${p.title}<span>${p.category}</span></a>`).join('');
  };

  input.addEventListener('input', (e) => renderResults(e.target.value));
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') renderResults('');
  });
  clear.addEventListener('click', () => {
    input.value = '';
    renderResults('');
    input.focus();
  });

  wrap.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    location.href = q ? `/reviews.html?q=${encodeURIComponent(q)}` : '/reviews.html';
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) results.hidden = true;
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
  });

  nav.prepend(wrap);
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
      <div>
        <h3>M2Z Reviews</h3>
        <p>Independent product analysis with transparent testing and practical verdicts.</p>
        <p class="meta">Last content update: ${lastUpdated}</p>
      </div>
      <div>
        <h4>Navigate</h4>
        <ul>
          <li><a href="/reviews.html">Reviews</a></li>
          <li><a href="/compare.html">Compare</a></li>
          <li><a href="/about.html">About</a></li>
        </ul>
      </div>
      <div>
        <h4>Editorial</h4>
        <ul>
          <li><a href="/about.html">Methodology</a></li>
          <li><a href="/about.html">Disclosure</a></li>
          <li><a href="/about.html">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4>Newsletter</h4>
        <form class="footer-news" data-footer-news>
          <input type="email" required placeholder="Email address" aria-label="Email address" />
          <button class="btn" type="submit">Subscribe</button>
        </form>
        <p class="meta" data-news-status></p>
      </div>
    </section>
    <p class="footer-bottom">© ${year} M2Z Reviews. All rights reserved.</p>
  `;

  footer.querySelector('[data-footer-news]')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = footer.querySelector('[data-news-status]');
    status.textContent = 'Thanks! You are subscribed.';
  });
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

  if (document.body.dataset.page === 'post' && !document.querySelector('.reading-progress')) {
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
      const h = document.documentElement;
      const ratio = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;
    });

    const title = document.querySelector('.article h1');
    if (title) {
      const copy = document.createElement('button');
      copy.className = 'copy-link';
      copy.textContent = 'Copy link';
      copy.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(location.href);
          copy.textContent = 'Copied';
          setTimeout(() => (copy.textContent = 'Copy link'), 1000);
        } catch {
          copy.textContent = 'Cannot copy';
        }
      });
      title.insertAdjacentElement('afterend', copy);
    }
  }
}

function renderReviewsControls(posts) {
  const host = document.querySelector('[data-review-controls]');
  if (!host) return;

  const categories = ['All', ...new Set(posts.map((p) => p.category))];
  host.innerHTML = `
    <div class="review-controls">
      <div class="category-pills" data-category-pills>
        ${categories.map((c) => `<button type="button" data-cat="${c}">${c}</button>`).join('')}
      </div>
      <label class="sort-wrap">Sort
        <select data-sort>
          <option value="new">Latest first</option>
          <option value="old">Oldest first</option>
        </select>
      </label>
    </div>
    <p class="meta" data-review-stats></p>
  `;

  const params = new URLSearchParams(location.search);
  const q = (params.get('q') || '').trim().toLowerCase();
  let category = 'All';
  let sort = 'new';

  const grid = document.querySelector('[data-latest-grid]');
  const stats = host.querySelector('[data-review-stats]');

  const render = () => {
    let filtered = posts.filter((p) => category === 'All' || p.category === category);
    if (q) filtered = filtered.filter((p) => `${p.title} ${p.description}`.toLowerCase().includes(q));
    filtered = filtered.sort((a, b) => (sort === 'new' ? new Date(b.publishDate) - new Date(a.publishDate) : new Date(a.publishDate) - new Date(b.publishDate)));

    if (grid) grid.innerHTML = filtered.length ? filtered.map(postCard).join('') : '<div class="empty-state">No posts match your filters yet.</div>';
    if (stats) stats.textContent = `Showing ${filtered.length} post${filtered.length === 1 ? '' : 's'}${q ? ` for “${q}”` : ''}.`;

    host.querySelectorAll('[data-cat]').forEach((btn) => btn.classList.toggle('active', btn.dataset.cat === category));
  };

  host.querySelectorAll('[data-cat]').forEach((btn) => btn.addEventListener('click', () => {
    category = btn.dataset.cat;
    render();
  }));

  host.querySelector('[data-sort]').addEventListener('change', (e) => {
    sort = e.target.value;
    render();
  });

  render();
}

async function initHomepage() {
  const posts = await loadPosts();
  const latestGrid = document.querySelector('[data-latest-grid]');
  if (latestGrid) latestGrid.innerHTML = posts.slice(0, 6).map(postCard).join('');

  renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
  renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));

  const categories = [...new Set(posts.map((p) => p.category))];
  const categoriesEl = document.querySelector('[data-categories]');
  if (categoriesEl) categoriesEl.innerHTML = categories.map((c) => `<span class="badge">${c}</span>`).join(' ');

  const trendingEl = document.querySelector('[data-trending-block]');
  if (trendingEl) trendingEl.innerHTML = posts.filter((p) => p.trending).slice(0, 3).map((p) => `<li><a href="/posts/${p.slug}.html">${p.title}</a></li>`).join('');

  injectSearch(posts);
}

async function initPostPage() {
  const slug = document.body.dataset.slug;
  if (!slug) return;
  const posts = await loadPosts();
  const current = posts.find((p) => p.slug === slug);
  if (!current) return;

  renderList(document.querySelector('[data-sidebar-latest]'), posts.slice(0, 5), { meta: true });
  renderList(document.querySelector('[data-sidebar-trending]'), posts.filter((p) => p.trending).slice(0, 5));

  const related = posts.filter((p) => p.slug !== slug && p.category === current.category).slice(0, 3);
  const relatedEl = document.querySelector('[data-related-posts]');
  if (relatedEl) relatedEl.innerHTML = related.map(postCard).join('');

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.href = `${SITE_URL}/posts/${slug}.html`;

  injectSearch(posts);
}

document.addEventListener('DOMContentLoaded', async () => {
  initThemeToggle();
  injectNoticeBar();
  initHeaderEnhancements();
  injectBreadcrumb();
  setupUtilityUi();

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

  enhanceFooter(posts);
});
